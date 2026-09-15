#!/usr/bin/env node
/**
 * 构建期数据生成（在 vite build 之前跑）
 *
 * 为什么需要它：本站是纯静态导出，运行时没有服务器。
 * - 若页面用 `+page.server.ts`（服务端 load），浏览器端导航会去请求 `/xxx/__data.json`，
 *   而 adapter-static 不会生成这个文件 → 站内跳转 404；
 * - 若页面用通用 load 直接 import `$lib/content`（node:fs），fs 逻辑会被打进客户端包 → 浏览器里报错。
 *
 * 所以这里在构建期把内容编译成静态 JSON，页面统一用通用 load `fetch('/data/...')`：
 * 预渲染时能取到数据（SSR 出一份完整 HTML，SEO 不变），客户端导航时取同一份 JSON。
 *
 * 产出（派生文件，已加入 .gitignore）：
 *   static/data/posts.json          —— { siteUrl, posts[], categories[] }
 *   static/data/posts/<slug>.json   —— { siteUrl, post, html, toc, coverUrl }
 */
import fs from 'node:fs'
import path from 'node:path'
import { renderMarkdown } from '../src/lib/markdown.ts'
import { listCategories, listPosts, listSlugs, readPost } from '../src/lib/content.ts'

const root = process.cwd()
const outDir = path.join(root, 'static', 'data')
const postDir = path.join(outDir, 'posts')

/** 与 src/lib/site-url.ts 同样的优先级（那边用了 process.env，属于服务端模块，这里单独算一份） */
function resolveSiteUrl() {
	const explicit = process.env.PUBLIC_SITE_URL || process.env.SITE_URL
	if (explicit) return explicit.replace(/\/+$/, '')
	const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
	if (productionHost) return `https://${productionHost}`.replace(/\/+$/, '')
	const previewHost = process.env.VERCEL_URL
	if (previewHost) return `https://${previewHost}`.replace(/\/+$/, '')
	return 'https://soq.app'
}

const siteUrl = resolveSiteUrl()

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(postDir, { recursive: true })

const posts = listPosts()
const categories = listCategories()
fs.writeFileSync(path.join(outDir, 'posts.json'), JSON.stringify({ siteUrl, posts, categories }, null, '\t') + '\n')

// 关于页的 Markdown 也在这里渲染好，避免浏览器端导航时再跑一遍 marked/shiki/katex
const aboutFile = path.join(root, 'src', 'lib', 'data', 'about.json')
if (fs.existsSync(aboutFile)) {
	const about = JSON.parse(fs.readFileSync(aboutFile, 'utf8'))
	const { html } = await renderMarkdown(String(about.content ?? ''))
	fs.writeFileSync(
		path.join(outDir, 'about.json'),
		JSON.stringify({ title: about.title, description: about.description, html }, null, '\t') + '\n'
	)
}

let rendered = 0
for (const slug of listSlugs()) {
	const post = readPost(slug)
	if (!post) continue
	const { html, toc } = await renderMarkdown(post.markdown)
	const { markdown: _markdown, ...meta } = post
	const coverUrl = post.cover ? (post.cover.startsWith('http') ? post.cover : `${siteUrl}${post.cover}`) : undefined
	fs.writeFileSync(path.join(postDir, `${slug}.json`), JSON.stringify({ siteUrl, post: meta, html, toc, coverUrl }, null, '\t') + '\n')
	rendered++
}

console.log(`[build-data] siteUrl=${siteUrl}，生成 posts.json（${posts.length} 篇、${categories.length} 个分类）与 ${rendered} 个文章 JSON → static/data/`)
