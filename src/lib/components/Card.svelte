<script lang="ts">
	import type { Snippet } from 'svelte'
	import { cn, ANIMATION_DELAY } from '$lib/utils'

	/**
	 * 首页卡片外壳（移植自旧站 src/components/card.tsx，但定位方式做了改进）
	 *
	 * 旧实现用 JS 计算屏幕中心再算像素坐标，结果是"没 JS 就没有布局"。
	 * 现在推荐传 `ox` / `oy`（相对屏幕中心的偏移），Card 用 CSS calc 定位：
	 *   left: calc(50% + ox)   top: calc(50% - 24px + oy)
	 * 好处：预渲染 HTML 直接就是正确布局、无需水合、窗口缩放自动跟随。
	 *
	 * 仍然兼容旧的 `x` / `y`（绝对像素坐标），供尚未改造的卡片使用。
	 */
	let {
		width,
		height,
		ox,
		oy,
		x = 0,
		y = 0,
		order = 0,
		class: klass = '',
		children
	}: {
		width: number
		height?: number
		ox?: number
		oy?: number
		x?: number
		y?: number
		order?: number
		class?: string
		children: Snippet
	} = $props()

	const useCssPosition = $derived(typeof ox === 'number' && typeof oy === 'number')

	const style = $derived.by(() => {
		const size = `width:${width}px;${height ? `height:${height}px;` : ''}`
		const position = useCssPosition ? `left:calc(50% + ${ox}px);top:calc(50% - 24px + ${oy}px);` : `left:${x}px;top:${y}px;`
		return `${position}${size}animation-delay:${(order * ANIMATION_DELAY).toFixed(2)}s;`
	})
</script>

<div class={cn('card squircle card-anim card-hover max-sm:static max-sm:translate-0', klass)} {style}>
	{@render children()}
</div>
