#!/usr/bin/env node
/**
 * 内容同步：把内容仓库里的 public/blogs 复制到本站 static/blogs。
 *
 * 内容仍放在仓库的 public/ 下（写作控制台就是往那里提交的），构建时同步进 static/，
 * 因此 static/blogs 与 static/data 都是派生目录、不入库。
 *
 * 源目录自动探测：
 *   1. <项目根>/public/blogs            —— 应用与内容同仓库（线上/Vercel 构建就是这种）
 *   2. ../2025-blog-public/public/blogs —— 本地把新站放在旧仓库旁边开发时
 *
 * 用法：
 *   node scripts/sync-content.mjs
 *   CONTENT_SOURCE=/path/to/blogs node scripts/sync-content.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const dest = path.join(projectRoot, 'static', 'blogs')

const candidates = [
	path.join(projectRoot, 'public', 'blogs'),
	path.resolve(projectRoot, '..', '2025-blog-public', 'public', 'blogs')
]
const source = process.env.CONTENT_SOURCE
	? path.resolve(process.env.CONTENT_SOURCE)
	: (candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0])

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp'])

function sameFile(a, b) {
	try {
		const sa = fs.statSync(a)
		const sb = fs.statSync(b)
		return sa.size === sb.size && Math.abs(sa.mtimeMs - sb.mtimeMs) < 1000
	} catch {
		return false
	}
}

function copyIfChanged(from, to) {
	if (sameFile(from, to)) return false
	fs.mkdirSync(path.dirname(to), { recursive: true })
	fs.copyFileSync(from, to)
	return true
}

if (!fs.existsSync(source)) {
	console.warn(`[sync-content] 内容源不存在：${source}`)
	console.warn('[sync-content] 若 static/blogs 已存在则继续构建；否则请设置 CONTENT_SOURCE')
	process.exit(0)
}

fs.mkdirSync(dest, { recursive: true })

let copied = 0
let skipped = 0
let posts = 0

for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
	// categories.json 这类散文件
	if (entry.isFile()) {
		if (entry.name === 'categories.json') {
			copyIfChanged(path.join(source, entry.name), path.join(dest, entry.name)) ? copied++ : skipped++
		}
		continue
	}
	if (!entry.isDirectory()) continue

	posts++
	const fromDir = path.join(source, entry.name)
	const toDir = path.join(dest, entry.name)
	fs.mkdirSync(toDir, { recursive: true })

	for (const file of fs.readdirSync(fromDir, { withFileTypes: true })) {
		if (!file.isFile()) continue
		const ext = path.extname(file.name).toLowerCase()
		const isMeta = file.name === 'index.md' || file.name === 'config.json'
		if (!isMeta && !IMAGE_EXT.has(ext)) continue
		copyIfChanged(path.join(fromDir, file.name), path.join(toDir, file.name)) ? copied++ : skipped++
	}
}

console.log(`[sync-content] 源：${source}`)
console.log(`[sync-content] 目标：${dest}`)
console.log(`[sync-content] ${posts} 篇文章，复制 ${copied} 个文件，跳过未变更 ${skipped} 个`)

// ---------- 静态资源（图片 / 音乐 / Live2D / favicon 等） ----------
const publicDir = path.resolve(source, '..')
const staticDir = path.join(projectRoot, 'static')
const ASSET_DIRS = ['images', 'music', 'live2d']
// manifest.json 由本仓库自己维护（已补全 name/icons/theme_color），不再从旧仓库覆盖
const ASSET_FILES = ['favicon.png']

function copyTree(fromDir, toDir) {
	if (!fs.existsSync(fromDir)) return { copied: 0, skipped: 0 }
	let c = 0
	let s = 0
	for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
		const from = path.join(fromDir, entry.name)
		const to = path.join(toDir, entry.name)
		if (entry.isDirectory()) {
			fs.mkdirSync(to, { recursive: true })
			const nested = copyTree(from, to)
			c += nested.copied
			s += nested.skipped
			continue
		}
		copyIfChanged(from, to) ? c++ : s++
	}
	return { copied: c, skipped: s }
}

let assetCopied = 0
let assetSkipped = 0
for (const dir of ASSET_DIRS) {
	const result = copyTree(path.join(publicDir, dir), path.join(staticDir, dir))
	assetCopied += result.copied
	assetSkipped += result.skipped
}
for (const file of ASSET_FILES) {
	const from = path.join(publicDir, file)
	if (!fs.existsSync(from)) continue
	copyIfChanged(from, path.join(staticDir, file)) ? assetCopied++ : assetSkipped++
}
console.log(`[sync-content] 静态资源：复制 ${assetCopied} 个，跳过未变更 ${assetSkipped} 个（${ASSET_DIRS.join(', ')} 等）`)

