/**
 * 视口断点（移植自旧站 src/hooks/use-size.ts）
 *
 * Svelte 5 runes 写法：组件里直接读 `viewport.maxSM` 即是响应式的。
 * 由 src/routes/+layout.svelte 在 onMount 时调用 startViewport() 初始化。
 */
class Viewport {
	init = $state(false)
	maxXL = $state(false)
	maxLG = $state(false)
	maxMD = $state(false)
	maxSM = $state(false)
	maxXS = $state(false)

	recalc() {
		if (typeof window === 'undefined') return
		const width = window.innerWidth
		this.init = true
		this.maxXL = width < 1280
		this.maxLG = width < 1024
		this.maxMD = width < 768
		this.maxSM = width < 640
		this.maxXS = width < 360
	}
}

export const viewport = new Viewport()

export function startViewport() {
	const update = () => viewport.recalc()
	update()
	window.addEventListener('resize', update)
	return () => window.removeEventListener('resize', update)
}
