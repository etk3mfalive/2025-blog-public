import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import BlogDetail from './blog-detail'
import type { BlogConfig } from '@/app/blog/types'
import { getSiteUrl } from '@/lib/site-url'

type PageProps = { params: Promise<{ id: string }> }

const BLOG_ROOT = path.join(process.cwd(), 'public', 'blogs')
/** slug 只允许字母/数字/下划线/连字符，避免路径穿越 */
const SAFE_SLUG = /^[A-Za-z0-9_-]+$/

/**
 * 构建期/请求期在服务端读取单篇文章的 config.json。
 * 这样文章页即使正文仍由客户端渲染，至少能输出正确的 title / description /
 * canonical / og:image / JSON-LD，修复“分享无卡片、搜索引擎只见空壳”的问题。
 */
function readBlogConfig(slug: string): BlogConfig | null {
	if (!slug || !SAFE_SLUG.test(slug)) return null
	try {
		const raw = fs.readFileSync(path.join(BLOG_ROOT, slug, 'config.json'), 'utf8')
		return JSON.parse(raw) as BlogConfig
	} catch {
		return null
	}
}

export async function generateStaticParams() {
	try {
		return fs
			.readdirSync(BLOG_ROOT, { withFileTypes: true })
			.filter(entry => entry.isDirectory())
			.map(entry => ({ id: entry.name }))
	} catch {
		return []
	}
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params
	const config = readBlogConfig(id)
	if (!config) return {}

	const siteUrl = getSiteUrl()
	const title = config.title || id
	const description = config.summary || undefined
	const url = `${siteUrl}/blog/${id}`
	const cover = config.cover ? (config.cover.startsWith('http') ? config.cover : `${siteUrl}${config.cover}`) : undefined

	return {
		title,
		description,
		alternates: { canonical: url },
		openGraph: {
			type: 'article',
			title,
			description,
			url,
			publishedTime: config.date,
			tags: config.tags?.filter(Boolean),
			images: cover ? [cover] : undefined
		},
		twitter: {
			card: cover ? 'summary_large_image' : 'summary',
			title,
			description,
			images: cover ? [cover] : undefined
		},
		robots: config.hidden ? { index: false, follow: false } : undefined
	}
}

export default async function Page({ params }: PageProps) {
	const { id } = await params
	const config = readBlogConfig(id)
	if (!config) notFound()

	const siteUrl = getSiteUrl()
	const cover = config.cover ? (config.cover.startsWith('http') ? config.cover : `${siteUrl}${config.cover}`) : undefined

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: config.title || id,
		description: config.summary || undefined,
		image: cover ? [cover] : undefined,
		datePublished: config.date,
		dateModified: config.date,
		inLanguage: 'zh-CN',
		keywords: config.tags?.filter(Boolean).join(','),
		mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/blog/${id}` },
		author: { '@type': 'Person', name: 'Sonquain' },
		publisher: { '@type': 'Person', name: 'Sonquain' }
	}

	return (
		<>
			<script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
			<BlogDetail />
		</>
	)
}
