/**
 * 站点 URL 唯一来源（服务端/构建期使用）
 *
 * 优先级：PUBLIC_SITE_URL / SITE_URL（显式覆盖）→ 正式域名常量
 *
 * 有意不使用 VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL：那会让 canonical、og:url、
 * sitemap、RSS 指向 xxx.vercel.app 的生产或预览域名。要换域名时设置 PUBLIC_SITE_URL 即可。
 */
const PRODUCTION_DOMAIN = 'https://soq.app'

const trim = (url: string) => url.replace(/\/+$/, '')

export function getSiteUrl(): string {
	const explicit = process.env.PUBLIC_SITE_URL || process.env.SITE_URL
	if (explicit) return trim(explicit)
	return PRODUCTION_DOMAIN
}

export function absoluteUrl(pathOrUrl: string, siteUrl: string = getSiteUrl()): string {
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
	if (!pathOrUrl) return siteUrl
	return `${siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}
