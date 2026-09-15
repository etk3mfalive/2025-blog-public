/**
 * 屏幕中心坐标（移植自旧站 src/hooks/use-center.ts）
 * 首页卡片用 center.x / center.y 加各自 offset 计算绝对位置。
 */
class Center {
	x = $state(0)
	y = $state(0)
	centerX = $state(0)
	centerY = $state(0)
	width = $state(0)
	height = $state(0)

	recalc() {
		if (typeof window === 'undefined') return
		const width = window.innerWidth
		const height = window.innerHeight
		this.width = width
		this.height = height
		this.centerX = Math.floor(width / 2)
		this.centerY = Math.floor(height / 2)
		this.x = Math.floor(width / 2)
		this.y = Math.floor(height / 2) - 24
	}

	setCenter(x: number, y: number) {
		this.x = x
		this.y = y
	}
}

export const center = new Center()

export function startCenter() {
	const update = () => center.recalc()
	update()
	window.addEventListener('resize', update)
	return () => window.removeEventListener('resize', update)
}
