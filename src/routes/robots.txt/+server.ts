import { getSiteUrl } from '$lib/site-url'

export const prerender = true

export function GET() {
	const siteUrl = getSiteUrl()
	const body = `User-Agent: *
Allow: /
Disallow: /write
Disallow: /write/

Host: ${siteUrl}
Sitemap: ${siteUrl}/sitemap.xml
`

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=0, must-revalidate'
		}
	})
}
