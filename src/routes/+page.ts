import type { PageLoad } from './$types'
// 只导入类型：`import type` 在编译期会被完全擦除，不会把 node:fs 带进客户端包
import type { BlogIndexItem } from '$lib/content'

/**
 * 首页数据（通用 load）
 *
 * 数据来自构建期生成的 static/data/posts.json —— 通用 load 在预渲染（Node）与浏览器端
 * 导航时都会执行，所以这里不能用 node:fs，也不能用服务端专属模块（如 $lib/site-url 读 process.env）。
 */
export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/data/posts.json')
		if (!res.ok) return { latestPost: null, postCount: 0 }
		const data = (await res.json()) as { posts?: BlogIndexItem[] }
		const posts = data.posts ?? []
		return {
			latestPost: posts[0] ?? null,
			postCount: posts.length
		}
	} catch {
		return { latestPost: null, postCount: 0 }
	}
}
