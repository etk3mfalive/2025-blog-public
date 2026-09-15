import type { PageLoad } from './$types'

/**
 * 关于页（旧站 src/app/about/page.tsx）
 *
 * Markdown 在构建期渲染成最终 HTML（static/data/about.json），
 * 这里用通用 load 读取：预渲染与浏览器端导航都能用，且不需要在浏览器里跑 markdown 渲染。
 * 旧页的编辑 / 导入 PEM / push-about 属于写作控制台的能力，本页只做只读展示。
 */
export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch('/data/about.json')
	if (!res.ok) return { title: '关于', description: '', html: '' }
	return (await res.json()) as { title: string; description: string; html: string }
}
