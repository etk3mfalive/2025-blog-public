/** 浏览器端编码/哈希工具（移植自旧站 src/lib/file-utils.ts） */

export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result || ''))
		reader.onerror = reject
		reader.readAsText(file)
	})
}

export function fileToBase64NoPrefix(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const dataUrl = String(reader.result || '')
			resolve(dataUrl.replace(/^data:[^;]+;base64,/, ''))
		}
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}

/** 内容 SHA-256 的前 16 位十六进制，用作图片文件名（与旧站一致） */
export async function hashFileSHA256(file: File): Promise<string> {
	const buf = await file.arrayBuffer()
	const digest = await crypto.subtle.digest('SHA-256', buf)
	const bytes = new Uint8Array(digest)
	let hex = ''
	for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
	return hex.slice(0, 16)
}

/** 字符串 → UTF-8 base64（GitHub contents/blobs API 需要） */
export function toBase64Utf8(input: string): string {
	const bytes = new TextEncoder().encode(input)
	let binary = ''
	const chunk = 0x8000
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
	}
	return btoa(binary)
}

/** base64 → UTF-8 字符串（GitHub 返回的 content 带换行） */
export function fromBase64Utf8(input: string): string {
	const binary = atob(input.replace(/\s+/g, ''))
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return new TextDecoder().decode(bytes)
}

export function getFileExt(filename: string): string {
	const idx = filename.lastIndexOf('.')
	return idx === -1 ? '' : filename.slice(idx)
}
