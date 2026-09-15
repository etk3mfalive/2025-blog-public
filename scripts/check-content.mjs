#!/usr/bin/env node
/**
 * 内容校验（构建前置）：把数据问题挡在构建阶段，而不是上线后才发现。
 *
 * 致命错误（exit 1）：JSON 解析失败、缺 index.md/config.json、缺 title、日期格式非法、
 *                    封面文件缺失、代码围栏不成对、slug 含非法字符。
 * 警告（不影响构建）：标签/分类/摘要为空、正文过短、图片重复等。
 */
import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'static', 'blogs')
const SAFE_SLUG = /^[A-Za-z0-9_-]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp'])

const errors = []
const warnings = []

if (!fs.existsSync(CONTENT_DIR)) {
	console.error(`[check-content] 内容目录不存在：${CONTENT_DIR}（先运行 pnpm sync-content）`)
	process.exit(1)
}

const categoriesFile = path.join(CONTENT_DIR, 'categories.json')
if (fs.existsSync(categoriesFile)) {
	try {
		const parsed = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'))
		if (!Array.isArray(parsed?.categories)) errors.push('categories.json：缺少 categories 数组')
	} catch (error) {
		errors.push(`categories.json 解析失败：${error.message}`)
	}
}

const slugs = fs
	.readdirSync(CONTENT_DIR, { withFileTypes: true })
	.filter(entry => entry.isDirectory())
	.map(entry => entry.name)

const seenTitles = new Map()

for (const slug of slugs) {
	const dir = path.join(CONTENT_DIR, slug)
	const configPath = path.join(dir, 'config.json')
	const mdPath = path.join(dir, 'index.md')

	if (!SAFE_SLUG.test(slug)) errors.push(`${slug}：slug 含非法字符（只允许字母/数字/下划线/连字符）`)
	if (!fs.existsSync(mdPath)) errors.push(`${slug}：缺少 index.md`)
	if (!fs.existsSync(configPath)) {
		errors.push(`${slug}：缺少 config.json`)
		continue
	}

	let config
	try {
		config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
	} catch (error) {
		errors.push(`${slug}：config.json 解析失败 — ${error.message}`)
		continue
	}

	if (!config.title) errors.push(`${slug}：config.json 缺少 title`)
	if (config.date && !DATE_RE.test(config.date)) errors.push(`${slug}：date 格式应为 YYYY-MM-DDTHH:mm，实际为 "${config.date}"`)
	if (!config.date) warnings.push(`${slug}：缺少 date`)
	if (!Array.isArray(config.tags) || config.tags.length === 0) warnings.push(`${slug}：tags 为空`)
	if (!config.category) warnings.push(`${slug}：category 为空`)
	if (!config.summary) warnings.push(`${slug}：缺少 summary`)

	if (config.title) {
		const dup = seenTitles.get(config.title)
		if (dup) errors.push(`${slug}：标题与 ${dup} 重复（"${config.title}"）`)
		else seenTitles.set(config.title, slug)
	}

	if (config.cover && !/^https?:/i.test(config.cover)) {
		const coverFile = path.join(process.cwd(), 'static', config.cover.replace(/^\/+/, ''))
		if (!fs.existsSync(coverFile)) errors.push(`${slug}：封面文件不存在 — ${config.cover}`)
	}

	if (fs.existsSync(mdPath)) {
		const md = fs.readFileSync(mdPath, 'utf8')
		const fences = md.split('\n').filter(line => /^\s*```/.test(line)).length
		if (fences % 2 !== 0) errors.push(`${slug}：代码围栏不成对（行首 \`\`\` 共 ${fences} 个）`)
		if (md.trim().length < 30) warnings.push(`${slug}：正文过短（${md.trim().length} 字符）`)

		// 正文里引用的本地图片是否存在
		for (const match of md.matchAll(/!\[[^\]]*\]\((\/blogs\/[^)\s]+)\)/g)) {
			const ref = path.join(process.cwd(), 'static', match[1].replace(/^\/+/, ''))
			if (!fs.existsSync(ref)) errors.push(`${slug}：正文引用的图片不存在 — ${match[1]}`)
		}
	}

	// 未被引用（正文与封面都没用到）的图片
	const referenced = new Set()
	if (config.cover) referenced.add(path.basename(config.cover))
	const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : ''
	for (const match of md.matchAll(/\/([A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp|gif|avif))/g)) referenced.add(match[1])
	for (const file of fs.readdirSync(dir)) {
		if (!IMAGE_EXT.has(path.extname(file).toLowerCase())) continue
		if (!referenced.has(file)) warnings.push(`${slug}：图片未被正文或封面引用 — ${file}`)
	}
}

console.log(`[check-content] 检查 ${slugs.length} 篇文章`)
if (warnings.length) {
	console.log(`\n警告 ${warnings.length} 条：`)
	for (const w of warnings) console.log(`  ⚠ ${w}`)
}
if (errors.length) {
	console.error(`\n错误 ${errors.length} 条：`)
	for (const e of errors) console.error(`  ✖ ${e}`)
	process.exit(1)
}
console.log('内容校验通过 ✅')
