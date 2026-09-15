import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'
// 类型导入会被编译期擦除，不会把内容层的 fs 带进客户端包
import type { BlogIndexItem } from '$lib/content'

export type PostMeta = BlogIndexItem

/**
 * 文章详情（通用 load）
 *
 * 正文 HTML 与 TOC 都在构建期生成好（static/data/posts/<slug>.json），
 * 因此这里既不需要 fs、也不需要在浏览器里跑 markdown 渲染。
 * 页面清单靠预渲染爬虫从 /blog 的链接发现（不再用 entries()，避免 import 服务端内容层）。
 */
export const load: PageLoad = async ({ fetch, params }) => {
	const res = await fetch(`/data/posts/${encodeURIComponent(params.slug)}.json`)
	if (!res.ok) error(404, '文章不存在')

	const data = (await res.json()) as {
		siteUrl: string
		post: PostMeta
		html: string
		toc: Array<{ id: string; text: string; level: number }>
		coverUrl?: string
	}

	return {
		post: data.post,
		html: data.html,
		toc: data.toc,
		siteUrl: data.siteUrl,
		coverUrl: data.coverUrl
	}
}
