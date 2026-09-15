/**
 * 站点 URL 的唯一来源（仅服务端/构建期使用）
 *
 * 优先级：
 * 1. NEXT_PUBLIC_SITE_URL / SITE_URL —— 正式域名（可用环境变量覆盖）
 * 2. VERCEL_PROJECT_PRODUCTION_URL  —— Vercel 提供的“生产域名”，不会像 VERCEL_URL 那样指向预览部署
 * 3. VERCEL_URL                     —— 兜底（预览部署）
 * 4. PRODUCTION_FALLBACK            —— 本地/无环境变量时回退到正式域名
 *
 * 注意：以前 sitemap 用 VERCEL_URL，导致线上 sitemap 里全是预览域名；RSS 则硬编码回退到
 * 模板作者域名（www.yysuni.com）。两者都改为走这里。
 */
const PRODUCTION_FALLBACK = 'https://soq.app'

function trimTrailingSlash(url: string): string {
	return url.replace(/\/+$/, '')
}

export function getSiteUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
	if (explicit) return trimTrailingSlash(explicit)

	const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
	if (productionHost) return trimTrailingSlash(`https://${productionHost}`)

	const previewHost = process.env.VERCEL_URL
	if (previewHost) return trimTrailingSlash(`https://${previewHost}`)

	return PRODUCTION_FALLBACK
}

/** 把站内相对路径拼成绝对地址，已是绝对地址时原样返回 */
export function absoluteUrl(pathOrUrl: string, siteUrl: string = getSiteUrl()): string {
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
	if (!pathOrUrl) return siteUrl
	return `${siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}
