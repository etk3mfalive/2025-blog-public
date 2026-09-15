import { listPosts } from '$lib/content'
import { getSiteUrl } from '$lib/site-url'

export const prerender = true

/** 已实现的静态页面（后续迁移新页面时在此追加） */
const STATIC_ROUTES: Array<{ path: string; priority: number; changefreq: string }> = [
	{ path: '/', priority: 1, changefreq: 'daily' },
	{ path: '/blog', priority: 0.9, changefreq: 'daily' },
	{ path: '/about', priority: 0.7, changefreq: 'monthly' },
	{ path: '/share', priority: 0.6, changefreq: 'weekly' },
	{ path: '/bloggers', priority: 0.6, changefreq: 'weekly' },
	{ path: '/pictures', priority: 0.5, changefreq: 'weekly' },
	{ path: '/snippets', priority: 0.5, changefreq: 'monthly' },
	{ path: '/svgs', priority: 0.3, changefreq: 'monthly' },
	{ path: '/clock', priority: 0.4, changefreq: 'monthly' },
	{ path: '/image-toolbox', priority: 0.4, changefreq: 'monthly' },
	{ path: '/live2d', priority: 0.4, changefreq: 'monthly' },
	{ path: '/wuthering-waves', priority: 0.4, changefreq: 'monthly' }
]

export function GET() {
	const siteUrl = getSiteUrl()
	const now = new Date().toISOString()

	const staticUrls = STATIC_ROUTES.map(
		route => `	<url>
		<loc>${siteUrl}${route.path === '/' ? '' : route.path}</loc>
		<lastmod>${now}</lastmod>
		<changefreq>${route.changefreq}</changefreq>
		<priority>${route.priority}</priority>
	</url>`
	).join('\n')

	const postUrls = listPosts()
		.map(
			post => `	<url>
		<loc>${siteUrl}/blog/${post.slug}</loc>
		<lastmod>${post.date ? new Date(post.date).toISOString() : now}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>`
		)
		.join('\n')

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${postUrls}
</urlset>`

	return new Response(xml, {
		headers: {
			'content-type': 'application/xml',
			'cache-control': 'public, max-age=0, must-revalidate'
		}
	})
}
