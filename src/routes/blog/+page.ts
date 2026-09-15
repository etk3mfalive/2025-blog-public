import type { PageLoad } from './$types'

type PostMeta = {
	slug: string
	title: string
	date: string
	tags: string[]
	summary?: string
	cover?: string
	hidden?: boolean
	category?: string
}

/** 博客列表数据（通用 load，理由见 src/routes/+page.ts） */
export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/data/posts.json')
		if (!res.ok) return { posts: [], tags: [], categories: [] }
		const data = (await res.json()) as { posts?: PostMeta[]; categories?: string[] }
		const posts = (data.posts ?? []).filter(post => !post.hidden)
		const tags = [...new Set(posts.flatMap(post => post.tags ?? []).filter(Boolean))].sort()
		return { posts, tags, categories: data.categories ?? [] }
	} catch {
		return { posts: [], tags: [], categories: [] }
	}
}
