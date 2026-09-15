/**
 * 认证与令牌管理（替代旧站 src/lib/auth.ts + hooks/use-auth.ts）
 *
 * 与旧实现的关键差别（安全）：
 * - 旧站用 `NEXT_PUBLIC_GITHUB_ENCRYPT_KEY`（会打进客户端包的公开常量）做 AES-GCM，
 *   等于把"加密私钥"变成混淆，任何人都能解开；
 * - 这里改为**用户口令 + PBKDF2-SHA256（25 万次迭代）**派生 AES-GCM 密钥，
 *   sessionStorage 里只存 {salt, iv, 密文}；不给口令就只放在内存里（关标签页即失效）。
 */
import { GITHUB, repoConfigured } from './config'
import { createInstallationToken, getInstallationId, setUnauthorizedHandler, signAppJwt } from './client'

const TOKEN_KEY = 'selfweb:gh-token'
const KEY_KEY = 'selfweb:gh-key'
const PBKDF2_ITERATIONS = 250_000

type StoredKey = { v: 1; salt: string; iv: string; data: string }

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
	const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	)
}

class GithubAuth {
	/** 内存里是否已有私钥（本次页面会话） */
	hasKey = $state(false)
	/** sessionStorage 里是否存了加密私钥（需要口令解锁） */
	remembered = $state(false)
	/** 是否已有可用的 installation token */
	tokenReady = $state(false)
	status = $state<'idle' | 'working' | 'ready' | 'error'>('idle')
	error = $state<string | null>(null)
	progress = $state<string | null>(null)

	private privateKey: string | null = null
	private token: string | null = null

	constructor() {
		setUnauthorizedHandler(() => {
			this.token = null
			this.tokenReady = false
			try {
				sessionStorage.removeItem(TOKEN_KEY)
			} catch {
				// ignore
			}
		})
	}

	/** 页面加载时调用：恢复 token 缓存与"记住了私钥"的标记 */
	init() {
		if (typeof sessionStorage === 'undefined') return
		try {
			this.token = sessionStorage.getItem(TOKEN_KEY)
			this.tokenReady = Boolean(this.token)
			this.remembered = Boolean(sessionStorage.getItem(KEY_KEY))
		} catch {
			this.token = null
			this.remembered = false
		}
	}

	get configured(): boolean {
		return repoConfigured()
	}

	get canPublish(): boolean {
		return this.tokenReady || this.hasKey
	}

	/** 选择私钥文件后调用。传 passphrase 则加密后存入 sessionStorage */
	async setPrivateKey(pem: string, passphrase?: string): Promise<void> {
		const trimmed = pem.trim()
		if (!/-----BEGIN (RSA )?PRIVATE KEY-----/.test(trimmed)) {
			throw new Error('这不是一个有效的 PEM 私钥文件')
		}
		this.privateKey = trimmed
		this.hasKey = true
		this.error = null

		// 私钥可能变了：清掉旧 token
		this.token = null
		this.tokenReady = false
		try {
			sessionStorage.removeItem(TOKEN_KEY)
		} catch {
			// ignore
		}

		if (passphrase) {
			const salt = crypto.getRandomValues(new Uint8Array(16))
			const iv = crypto.getRandomValues(new Uint8Array(12))
			const key = await deriveKey(passphrase, salt)
			const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(trimmed))
			const stored: StoredKey = {
				v: 1,
				salt: bytesToBase64(salt),
				iv: bytesToBase64(iv),
				data: bytesToBase64(new Uint8Array(data))
			}
			sessionStorage.setItem(KEY_KEY, JSON.stringify(stored))
			this.remembered = true
		}
	}

	/** 用口令解开 sessionStorage 里的私钥 */
	async unlock(passphrase: string): Promise<boolean> {
		if (typeof sessionStorage === 'undefined') return false
		const raw = sessionStorage.getItem(KEY_KEY)
		if (!raw) return false
		try {
			const stored = JSON.parse(raw) as StoredKey
			const key = await deriveKey(passphrase, base64ToBytes(stored.salt))
			const plain = await crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv: base64ToBytes(stored.iv) as BufferSource },
				key,
				base64ToBytes(stored.data) as BufferSource
			)
			this.privateKey = new TextDecoder().decode(plain)
			this.hasKey = true
			this.error = null
			return true
		} catch {
			this.error = '口令不正确，或缓存已损坏'
			return false
		}
	}

	/** 拿 installation token：优先用缓存，否则现签 JWT 换取（有效期约 1 小时） */
	async getToken(): Promise<string> {
		if (this.token) return this.token

		if (!repoConfigured()) {
			throw new Error('未配置 GitHub App：需要 PUBLIC_GITHUB_APP_ID / OWNER / REPO')
		}
		if (!this.privateKey) {
			throw new Error('需要先选择 GitHub App 私钥文件')
		}

		this.status = 'working'
		try {
			this.progress = '正在签发 JWT…'
			const jwt = await signAppJwt(GITHUB.appId, this.privateKey)

			this.progress = '正在查询安装信息…'
			const installationId = await getInstallationId(jwt, GITHUB.owner, GITHUB.repo)

			this.progress = '正在创建安装令牌…'
			const token = await createInstallationToken(jwt, installationId)

			this.token = token
			this.tokenReady = true
			this.status = 'ready'
			this.progress = null
			try {
				sessionStorage.setItem(TOKEN_KEY, token)
			} catch {
				// ignore
			}
			return token
		} catch (error) {
			this.status = 'error'
			this.progress = null
			this.error = error instanceof Error ? error.message : String(error)
			throw error
		}
	}

	/** 清掉令牌与内存私钥（保留 sessionStorage 里的加密私钥） */
	clearToken() {
		this.token = null
		this.tokenReady = false
		this.privateKey = null
		this.hasKey = false
		try {
			sessionStorage.removeItem(TOKEN_KEY)
		} catch {
			// ignore
		}
	}

	/** 彻底忘记：令牌 + 内存私钥 + 已记住的加密私钥 */
	forget() {
		this.clearToken()
		this.remembered = false
		try {
			sessionStorage.removeItem(KEY_KEY)
		} catch {
			// ignore
		}
	}
}

export const githubAuth = new GithubAuth()

export async function readPrivateKeyFile(file: File): Promise<string> {
	return file.text()
}
