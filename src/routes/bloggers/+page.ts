import bloggerList from '$lib/data/bloggers.json'

/**
 * 友链页（旧站 src/app/bloggers/page.tsx）
 *
 * 只读展示：搜索、近期更新 / 长期失联筛选在 GridView 里完成；
 * 新增 / 编辑 / 删除 / 头像上传 / 导入 PEM / push-bloggers 属于 P4，已移除。
 */
export function load() {
	return {
		bloggers: bloggerList,
		title: '友链',
		description: 'Sonquain 常读的博客与友链'
	}
}
