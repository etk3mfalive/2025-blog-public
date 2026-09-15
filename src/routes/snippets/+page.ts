import snippetList from '$lib/data/snippets.json'

const getRandomSnippet = (list: string[]) => (list.length === 0 ? '' : list[Math.floor(Math.random() * list.length)])

/**
 * 片段页（旧站 src/app/snippets/page.tsx）
 *
 * 只读展示：进入页面随机取一条（构建期先烘焙一条，客户端挂载后再按需重抽）；
 * 管理弹窗 / 新增 / 删除 / 导入 PEM / push-snippets 属于 P4，已移除。
 */
export function load() {
	return {
		snippets: snippetList,
		snippet: getRandomSnippet(snippetList),
		title: '片段',
		description: '记录，是对某项技术，重新、独立思考'
	}
}
