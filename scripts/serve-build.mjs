#!/usr/bin/env node
/**
 * 本地预览构建产物（模拟 Vercel 的 cleanUrls 行为）
 *
 * 用途：不启动 Vite、不依赖任何第三方包，直接把 build/ 目录当静态站跑起来，
 * 用于在浏览器里检查"部署后会是什么样"。
 *
 * 用法：node scripts/serve-build.mjs [端口]
 * 默认端口 4173，绑定 127.0.0.1。
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const root = path.join(process.cwd(), 'build')
const port = Number(process.argv[2] || process.env.PORT || 4173)
const host = '127.0.0.1'

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.mp3': 'audio/mpeg',
	'.m4a': 'audio/mp4',
	'.woff2': 'font/woff2',
	'.map': 'application/json; charset=utf-8'
}

function resolveFile(pathname) {
	// 去掉查询串、解码、防目录穿越
	let decoded
	try {
		decoded = decodeURIComponent(pathname.split('?')[0])
	} catch {
		return null
	}
	const target = path.normalize(path.join(root, decoded))
	if (!target.startsWith(root)) return null

	const candidates = []
	if (decoded.endsWith('/')) candidates.push(path.join(target, 'index.html'))
	candidates.push(target)
	if (!path.extname(target)) candidates.push(`${target}.html`, path.join(target, 'index.html'))

	for (const candidate of candidates) {
		try {
			const stat = fs.statSync(candidate)
			if (stat.isFile()) return candidate
		} catch {
			// 继续尝试下一个候选
		}
	}
	return null
}

const server = http.createServer((req, res) => {
	const url = req.url || '/'
	const file = resolveFile(url)

	if (!file) {
		const notFound = path.join(root, '404.html')
		if (fs.existsSync(notFound)) {
			res.writeHead(404, { 'content-type': MIME['.html'] })
			res.end(fs.readFileSync(notFound))
		} else {
			res.writeHead(404, { 'content-type': MIME['.txt'] })
			res.end('404')
		}
		return
	}

	const ext = path.extname(file).toLowerCase()
	const headers = { 'content-type': MIME[ext] || 'application/octet-stream' }
	// 与 vercel.json 一致的缓存策略
	if (url.startsWith('/_app/immutable/')) headers['cache-control'] = 'public, max-age=31536000, immutable'
	else headers['cache-control'] = 'no-cache'

	res.writeHead(200, headers)
	fs.createReadStream(file).pipe(res)
})

server.listen(port, host, () => {
	console.log(`[preview] 静态站已启动：http://${host}:${port}/`)
	console.log(`[preview] 目录：${root}`)
	console.log('[preview] 提示：写作页 http://%s:%d/write（本地访问属于安全上下文，WebCrypto 可用）', host, port)
})
