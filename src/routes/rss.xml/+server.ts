import fs from 'node:fs'
import path from 'node:path'
import { listPosts } from '$lib/content'
import { getSiteUrl } from '$lib/site-url'

export const prerender = true

const escapeXml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const CDATA = (value: string) => `<![CDATA[${value}]]>`

function mimeFromUrl(url: string): string | null {
	const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
	if (ext === 'png') return 'image/png'
	if (ext === 'gif') return 'image/gif'
	if (ext === 'webp') return 'image/webp'
	if (ext === 'svg') return 'image/svg+xml'
	return null
}

function enclosure(cover: string | undefined, siteUrl: string): string | null {
	if (!cover) return null
	const absolute = cover.startsWith('http') ? cover : `${siteUrl}${cover}`
	const type = mimeFromUrl(absolute)
	if (!type) return null
	let length: number | null = null
	if (!cover.startsWith('http')) {
		try {
			const stat = fs.statSync(path.join(process.cwd(), 'static', cover.replace(/^\/+/, '')))
			if (stat.isFile()) length = stat.size
		} catch {
			length = null
		}
	}
	if (length === null) return null
	return `<enclosure url="${escapeXml(absolute)}" type="${type}" length="${length}" />`
}

export function GET() {
	const siteUrl = getSiteUrl()
	const posts = listPosts()

	const items = posts
		.map(post => {
			const link = `${siteUrl}/blog/${post.slug}`
			const categories = (post.tags ?? []).filter(Boolean).map(tag => `<category>${escapeXml(tag)}</category>`).join('')
			const enc = enclosure(post.cover, siteUrl)
			return `
		<item>
			<title>${escapeXml(post.title)}</title>
			<link>${link}</link>
			<guid isPermaLink="false">${escapeXml(link)}</guid>
			<description>${CDATA(post.summary ?? '')}</description>
			<pubDate>${new Date(post.date).toUTCString()}</pubDate>
			${categories}
			${enc ?? ''}
		</item>`.trim()
		})
		.join('')

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel xmlns:atom="http://www.w3.org/2005/Atom">
		<title>SelfWeb</title>
		<link>${siteUrl}</link>
		<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
		<description>Sonquain 的个人博客，记录日常笔记。</description>
		<language>zh-CN</language>
		<ttl>60</ttl>
		<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
		${items}
	</channel>
</rss>`

	return new Response(rss, {
		headers: {
			'content-type': 'application/rss+xml; charset=utf-8',
			'cache-control': 'public, max-age=0, must-revalidate'
		}
	})
}
