/**
 * GitHub REST / Git Data API 封装（移植自旧站 src/lib/github-client.ts）
 *
 * 与旧实现的两点差别：
 * 1. JWT 签名改用 WebCrypto（RS256），不再依赖 jsrsasign；
 * 2. 支持 PKCS#1（-----BEGIN RSA PRIVATE KEY-----）私钥——GitHub App 下载的密钥
 *    就是 PKCS#1，而 WebCrypto 只接受 PKCS#8，这里在内存里做一次 DER 包装。
 */
import { GH_API } from './config'
import { fromBase64Utf8, toBase64Utf8 } from './base64'
import { signAppJwt } from './jwt'

export type TreeItem = {
	path: string
	mode: '100644' | '100755' | '040000' | '160000' | '120000'
	type: 'blob' | 'tree' | 'commit'
	content?: string
	sha?: string | null
}

// JWT（RS256）实现在 ./jwt.ts，单独放是为了能用 Node 直接跑测试
export { signAppJwt }

/* ------------------------------------------------------------------ */
/* REST 封装                                                           */
/* ------------------------------------------------------------------ */

const COMMON_HEADERS = {
	Accept: 'application/vnd.github+json',
	'X-GitHub-Api-Version': '2022-11-28'
}

export class GithubError extends Error {
	status: number
	body: unknown

	constructor(message: string, status: number, body: unknown) {
		super(message)
		this.name = 'GithubError'
		this.status = status
		this.body = body
	}
}

type AuthHeaders = { Authorization: string } | Record<string, never>

let onUnauthorized: (() => void) | null = null

/** 注册 401 回调（token 失效时清理缓存） */
export function setUnauthorizedHandler(handler: (() => void) | null) {
	onUnauthorized = handler
}

async function request<T>(url: string, init: RequestInit = {}, options: { auth?: string; allow404?: boolean } = {}): Promise<T> {
	const headers: Record<string, string> = { ...COMMON_HEADERS, ...((init.headers as Record<string, string>) || {}) }
	if (options.auth) headers.Authorization = `Bearer ${options.auth}`
	if (init.body) headers['Content-Type'] = 'application/json'

	const res = await fetch(url, { ...init, headers })
	if (options.allow404 && res.status === 404) return null as T

	if (!res.ok) {
		if (res.status === 401) onUnauthorized?.()
		let body: unknown = null
		try {
			body = await res.json()
		} catch {
			body = await res.text().catch(() => null)
		}
		const detail = typeof body === 'object' && body && 'message' in body ? String((body as { message: unknown }).message) : res.statusText
		throw new GithubError(`GitHub API ${res.status}: ${detail}`, res.status, body)
	}

	if (res.status === 204) return undefined as T
	return (await res.json()) as T
}

export async function getInstallationId(jwt: string, owner: string, repo: string): Promise<number> {
	const data = await request<{ id: number }>(`${GH_API}/repos/${owner}/${repo}/installation`, {}, { auth: jwt })
	return data.id
}

export async function createInstallationToken(jwt: string, installationId: number): Promise<string> {
	const data = await request<{ token: string }>(
		`${GH_API}/app/installations/${installationId}/access_tokens`,
		{ method: 'POST' },
		{ auth: jwt }
	)
	return data.token
}

export async function getRef(token: string, owner: string, repo: string, branch: string): Promise<string> {
	const data = await request<{ object: { sha: string } }>(
		`${GH_API}/repos/${owner}/${repo}/git/ref/${encodeURIComponent(`heads/${branch}`)}`,
		{},
		{ auth: token }
	)
	return data.object.sha
}

export async function createBlob(
	token: string,
	owner: string,
	repo: string,
	content: string,
	encoding: 'utf-8' | 'base64' = 'base64'
): Promise<string> {
	const data = await request<{ sha: string }>(
		`${GH_API}/repos/${owner}/${repo}/git/blobs`,
		{ method: 'POST', body: JSON.stringify({ content, encoding }) },
		{ auth: token }
	)
	return data.sha
}

export async function createTree(token: string, owner: string, repo: string, tree: TreeItem[], baseTree?: string): Promise<string> {
	const data = await request<{ sha: string }>(
		`${GH_API}/repos/${owner}/${repo}/git/trees`,
		{ method: 'POST', body: JSON.stringify({ tree, base_tree: baseTree }) },
		{ auth: token }
	)
	return data.sha
}

export async function createCommit(
	token: string,
	owner: string,
	repo: string,
	message: string,
	tree: string,
	parents: string[]
): Promise<string> {
	const data = await request<{ sha: string }>(
		`${GH_API}/repos/${owner}/${repo}/git/commits`,
		{ method: 'POST', body: JSON.stringify({ message, tree, parents }) },
		{ auth: token }
	)
	return data.sha
}

export async function updateRef(token: string, owner: string, repo: string, branch: string, sha: string, force = false): Promise<void> {
	await request(
		`${GH_API}/repos/${owner}/${repo}/git/refs/${encodeURIComponent(`heads/${branch}`)}`,
		{ method: 'PATCH', body: JSON.stringify({ sha, force }) },
		{ auth: token }
	)
}

export async function readTextFileFromRepo(token: string, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
	const data = await request<{ content?: string; type?: string } | unknown[]>(
		`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
		{},
		{ auth: token, allow404: true }
	)
	if (!data || Array.isArray(data)) return null
	const content = (data as { content?: string }).content
	if (!content) return null
	return fromBase64Utf8(content)
}

export async function listRepoFilesRecursive(token: string, owner: string, repo: string, path: string, ref: string): Promise<string[]> {
	const data = await request<unknown>(
		`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
		{},
		{ auth: token, allow404: true }
	)
	if (!data) return []

	if (Array.isArray(data)) {
		const files: string[] = []
		for (const item of data as Array<{ type: string; path: string }>) {
			if (item.type === 'file') files.push(item.path)
			else if (item.type === 'dir') files.push(...(await listRepoFilesRecursive(token, owner, repo, item.path, ref)))
		}
		return files
	}

	const single = data as { type?: string; path?: string }
	if (single.type === 'file' && single.path) return [single.path]
	if (single.type === 'dir' && single.path) return listRepoFilesRecursive(token, owner, repo, single.path, ref)
	return []
}

/** 兼容旧站 putFile 语义：按 sha 更新单个文件 */
export async function putFile(
	token: string,
	owner: string,
	repo: string,
	path: string,
	contentBase64: string,
	message: string,
	branch: string
): Promise<void> {
	const existing = await request<{ sha?: string } | null>(
		`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
		{},
		{ auth: token, allow404: true }
	)
	await request(
		`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
		{
			method: 'PUT',
			body: JSON.stringify({ message, content: contentBase64, branch, ...(existing?.sha ? { sha: existing.sha } : {}) })
		},
		{ auth: token }
	)
}

export { toBase64Utf8 }
