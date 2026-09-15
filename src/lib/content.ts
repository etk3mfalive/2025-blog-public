import fs from 'node:fs'
import path from 'node:path'

/**
 * 内容访问层（仅构建期 / 服务端使用）
 *
 * 内容来源：static/blogs/<slug>/{index.md,config.json}（由 scripts/sync-content.mjs 从
 * 旧仓库 public/blogs 同步，或迁移完成后直接由本仓库持有）。
 *
 * 设计要点（对应重构报告里的“内容治理”）：
 * - config.json 是唯一元数据来源，index.json 不再需要手工双写；
 * - 排序、隐藏过滤、分类聚合都在这里做，页面只管渲染；
 * - 读取失败不会静默返回空列表，而是抛出错误让构建失败。
 */

export type BlogIndexItem = {
	slug: string
	title: string
	tags: string[]
	date: string
	summary?: string
	cover?: string
	hidden?: boolean
	category?: string
}

export type BlogConfig = Omit<BlogIndexItem, 'slug' | 'title'> & {
	title?: string
}

export type Post = BlogIndexItem & { markdown: string }

export const CONTENT_DIR = path.join(process.cwd(), 'static', 'blogs')

/** slug 允许大小写（本项目决定不改动既有 slug），但禁止路径分隔符等危险字符 */
const SAFE_SLUG = /^[A-Za-z0-9_-]+$/

export function listSlugs(): string[] {
	if (!fs.existsSync(CONTENT_DIR)) return []
	return fs
		.readdirSync(CONTENT_DIR, { withFileTypes: true })
		.filter(entry => entry.isDirectory() && SAFE_SLUG.test(entry.name))
		.map(entry => entry.name)
		.sort()
}

export function readConfig(slug: string): BlogConfig | null {
	if (!SAFE_SLUG.test(slug)) return null
	const file = path.join(CONTENT_DIR, slug, 'config.json')
	if (!fs.existsSync(file)) return null
	return JSON.parse(fs.readFileSync(file, 'utf8')) as BlogConfig
}

export function readMarkdown(slug: string): string | null {
	if (!SAFE_SLUG.test(slug)) return null
	const file = path.join(CONTENT_DIR, slug, 'index.md')
	if (!fs.existsSync(file)) return null
	return fs.readFileSync(file, 'utf8')
}

export function readPost(slug: string): Post | null {
	const config = readConfig(slug)
	const markdown = readMarkdown(slug)
	if (!config || markdown === null) return null
	return {
		slug,
		title: config.title || slug,
		tags: config.tags ?? [],
		date: config.date ?? '',
		summary: config.summary,
		cover: config.cover,
		hidden: config.hidden ?? false,
		category: config.category ?? '',
		markdown
	}
}

function byDateDesc(a: BlogIndexItem, b: BlogIndexItem): number {
	return (b.date || '').localeCompare(a.date || '')
}

/** 全部文章（默认过滤 hidden），按日期倒序 */
export function listPosts({ includeHidden = false } = {}): BlogIndexItem[] {
	const posts: BlogIndexItem[] = []
	for (const slug of listSlugs()) {
		const post = readPost(slug)
		if (!post) continue
		if (post.hidden && !includeHidden) continue
		const { markdown: _markdown, ...meta } = post
		posts.push(meta)
	}
	return posts.sort(byDateDesc)
}

/** 分类列表：以 static/blogs/categories.json 为准，合并文章里实际用到的分类 */
export function listCategories(): string[] {
	const set = new Set<string>()
	const file = path.join(CONTENT_DIR, 'categories.json')
	if (fs.existsSync(file)) {
		try {
			const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { categories?: string[] }
			for (const c of parsed.categories ?? []) if (c) set.add(c)
		} catch (error) {
			throw new Error(`categories.json 解析失败: ${(error as Error).message}`)
		}
	}
	for (const post of listPosts({ includeHidden: true })) {
		if (post.category) set.add(post.category)
	}
	return [...set]
}
