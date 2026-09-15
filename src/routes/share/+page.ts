import shareList from '$lib/data/share.json'

/**
 * 分享页（旧站 src/app/share/page.tsx）
 *
 * 只读展示：搜索、标签筛选在 GridView 里完成；
 * 新增 / 编辑 / 删除 / logo 上传 / 导入 PEM / push-shares 属于 P4，已移除。
 */
export function load() {
	return {
		shares: shareList,
		title: '分享',
		description: 'Sonquain 收藏的网站、工具与资源分享'
	}
}
