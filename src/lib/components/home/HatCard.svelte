<script lang="ts">
	import { viewport } from '$lib/viewport.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { ANIMATION_DELAY } from '$lib/utils'

	/**
	 * 帽子卡片（移植自旧站 src/app/(home)/hat-card.tsx）
	 *
	 * 迁移差异：
	 * - motion.div 的入场动画（opacity 0→1 / scale 0.6→1）与 hover/tap 缩放改用 app.css 的
	 *   .card-anim + data-shown / .card-hover（与 Card.svelte 一致）；
	 * - 点击行为：旧站是「再叠一顶帽子」(number + 1)；按迁移要求改为点击本地翻转
	 *   （初值取 siteContent.hatFlipped，只改本地状态，不写回配置），因此叠帽的堆叠效果去掉了；
	 * - 去掉 HomeDraggableLayer，位置公式照抄旧文件（旧站这里没有用 Card 外壳，只有裸的 motion.div，本文件保持一致）；
	 * - 旧站 maxSM 时 return null，这里同样不渲染（viewport.init 之后才判定，SSR 首屏不会闪烁）。
	 */

	const styles = cardStyles.hatCard
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	const hatIndex = siteContent.currentHatIndex ?? 1

	let show = $state(false)
	let flipped = $state<boolean>(Boolean(siteContent.hatFlipped))

	// 旧站用 setTimeout(styles.order * ANIMATION_DELAY * 1000) 依次出场
	$effect(() => {
		const timer = setTimeout(() => (show = true), styles.order * ANIMATION_DELAY * 1000)
		return () => clearTimeout(timer)
	})

	const ox = offsetX !== null ? offsetX : -styles.width / 2
	const oy = offsetY !== null ? offsetY : -styles.height

	function toggleFlip() {
		flipped = !flipped
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			toggleFlip()
		}
	}
</script>

{#if !(viewport.maxSM && viewport.init)}
	<div
		class="card-anim card-hover absolute flex items-center justify-center"
		class:pointer-events-none={!show}
		data-shown={show}
		style="left:calc(50% + {ox}px);top:calc(50% - 24px + {oy}px);width:{styles.width}px;height:{styles.height}px"
		role="button"
		tabindex="0"
		aria-label="翻转帽子"
		onclick={toggleFlip}
		onkeydown={onKeydown}>
		<img
			src={`/images/hats/${hatIndex}.webp`}
			alt="hat"
			class="h-full w-full object-contain"
			style="width:{styles.width}px;height:{styles.height}px;transform:{flipped ? 'scaleX(-1)' : 'none'}" />
	</div>
{/if}
