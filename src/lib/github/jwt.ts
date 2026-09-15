/**
 * GitHub App JWT（RS256）—— 纯 WebCrypto 实现，无第三方依赖。
 *
 * 为什么单独一个文件：这段是写入链路里最容易出错的部分（PEM 解析 / DER 包装 / 签名），
 * 独立出来可以脱离 SvelteKit 用 Node 直接跑测试（见 scripts/check-jwt.mjs）。
 *
 * 注意：GitHub App 下载的私钥通常是 PKCS#1（-----BEGIN RSA PRIVATE KEY-----），
 * 而 WebCrypto 的 importKey('pkcs8') 只接受 PKCS#8，因此这里做一次 DER 包装。
 */

function base64UrlFromBytes(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlFromString(value: string): string {
	return base64UrlFromBytes(new TextEncoder().encode(value))
}

function pemToBytes(pem: string): Uint8Array {
	const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
	const binary = atob(body)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

/** DER 长度字段 */
function derLength(length: number): number[] {
	if (length < 0x80) return [length]
	const bytes: number[] = []
	let value = length
	while (value > 0) {
		bytes.unshift(value & 0xff)
		value >>= 8
	}
	return [0x80 | bytes.length, ...bytes]
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((n, p) => n + p.length, 0)
	const out = new Uint8Array(total)
	let offset = 0
	for (const part of parts) {
		out.set(part, offset)
		offset += part.length
	}
	return out
}

/** PKCS#1 RSA 私钥 → PKCS#8 */
export function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
	const algorithmIdentifier = new Uint8Array([
		0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00
	])
	const version = new Uint8Array([0x02, 0x01, 0x00])
	const octetString = concatBytes(new Uint8Array([0x04, ...derLength(pkcs1.length)]), pkcs1)
	const sequence = concatBytes(version, algorithmIdentifier, octetString)
	return concatBytes(new Uint8Array([0x30, ...derLength(sequence.length)]), sequence)
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
	const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(pem)
	const bytes = pemToBytes(pem)
	const der = isPkcs1 ? pkcs1ToPkcs8(bytes) : bytes
	// 显式转 BufferSource：TS 5.9 的 Uint8Array<ArrayBufferLike> 与 DOM 的 BufferSource 不完全重合
	return crypto.subtle.importKey('pkcs8', der as unknown as BufferSource, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

/** 生成 GitHub App 用的 RS256 JWT（iat = now-60s，exp = now+8min） */
export async function signAppJwt(appId: string, privateKeyPem: string, nowSeconds?: number): Promise<string> {
	const now = nowSeconds ?? Math.floor(Date.now() / 1000)
	const header = { alg: 'RS256', typ: 'JWT' }
	const payload = { iat: now - 60, exp: now + 8 * 60, iss: appId }

	const key = await importPrivateKey(privateKeyPem)
	const signingInput = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(payload))}`
	const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
	return `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`
}

export function decodeJwtPart(part: string): unknown {
	const padded = part.replace(/-/g, '+').replace(/_/g, '/')
	const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return JSON.parse(new TextDecoder().decode(bytes))
}
