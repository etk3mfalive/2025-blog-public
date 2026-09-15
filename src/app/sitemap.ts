import { MetadataRoute } from 'next'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-static'

/** 需要进 sitemap 的静态页面（/write 与各类编辑态页面不收录） */
const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
	{ path: '/', priority: 1, changeFrequency: 'daily' },
	{ path: '/blog', priority: 0.9, changeFrequency: 'daily' },
	{ path: '/about', priority: 0.7, changeFrequency: 'monthly' },
	{ path: '/share', priority: 0.6, changeFrequency: 'weekly' },
	{ path: '/bloggers', priority: 0.6, changeFrequency: 'weekly' },
	{ path: '/pictures', priority: 0.5, changeFrequency: 'weekly' },
	{ path: '/snippets', priority: 0.5, changeFrequency: 'monthly' },
	{ path: '/clock', priority: 0.4, changeFrequency: 'monthly' },
	{ path: '/image-toolbox', priority: 0.4, changeFrequency: 'monthly' },
	{ path: '/live2d', priority: 0.4, changeFrequency: 'monthly' },
	{ path: '/wuthering-waves', priority: 0.4, changeFrequency: 'monthly' },
	{ path: '/svgs', priority: 0.3, changeFrequency: 'monthly' }
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getSiteUrl()

	console.log(`[Sitemap] Generating for: ${baseUrl}`)

	const posts: BlogIndexItem[] = blogIndex

	const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(route => ({
		url: route.path === '/' ? baseUrl : `${baseUrl}${route.path}`,
		lastModified: new Date(),
		changeFrequency: route.changeFrequency,
		priority: route.priority
	}))

	const postEntries: MetadataRoute.Sitemap = posts
		.filter(post => post?.slug)
		.map(post => ({
			url: `${baseUrl}/blog/${post.slug}`,
			lastModified: post.date ? new Date(post.date) : new Date(),
			changeFrequency: 'weekly',
			priority: 0.8
		}))

	return [...staticEntries, ...postEntries]
}
