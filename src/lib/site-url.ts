/**
 * 站点 URL 唯一来源（与 Next 版 src/lib/site-url.ts 等价）
 *
 * 优先级：SITE_URL / PUBLIC_SITE_URL → Vercel 生产域名 → Vercel 预览域名 → 正式域名常量
 */
const PRODUCTION_FALLBACK = 'https://soq.app'

const trim = (url: string) => url.replace(/\/+$/, '')

export function getSiteUrl(): string {
	const explicit = process.env.PUBLIC_SITE_URL || process.env.SITE_URL
	if (explicit) return trim(explicit)

	const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
	if (productionHost) return trim(`https://${productionHost}`)

	const previewHost = process.env.VERCEL_URL
	if (previewHost) return trim(`https://${previewHost}`)

	return PRODUCTION_FALLBACK
}

export function absoluteUrl(pathOrUrl: string, siteUrl: string = getSiteUrl()): string {
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
	if (!pathOrUrl) return siteUrl
	return `${siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}
