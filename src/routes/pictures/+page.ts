import pictureList from '$lib/data/pictures.json'

/**
 * 图集页（旧站 src/app/pictures/page.tsx）
 *
 * 只读展示：随机散落布局、点击放大、拖拽偏移（localStorage）保留在 RandomLayout 里；
 * 上传 / 压缩工具 / 删除（单图、整组）/ 导入 PEM / push-pictures 属于 P4，已移除。
 */
export function load() {
	return {
		pictures: pictureList,
		title: '图集',
		description: 'Sonquain 的照片集：随手拍与旅行记录'
	}
}
