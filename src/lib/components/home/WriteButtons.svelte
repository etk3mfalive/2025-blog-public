<script lang="ts">
	import { viewport } from '$lib/viewport.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { ANIMATION_DELAY, CARD_SPACING } from '$lib/utils'
	import penSvg from '$lib/svgs/pen.svg?raw'

	/**
	 * 首页写文章入口（移植自旧站 src/app/(home)/write-buttons.tsx）
	 *
	 * 迁移差异：
	 * - 旧站有第二个按钮（dots.svg）用来打开 CMS 配置弹窗（setConfigDialogOpen）；
	 *   CMS 弹窗属于 P4 范围，这里直接去掉，只保留「写文章」入口；旧文件里也没有 /blog 入口，故不新增；
	 * - 旧站用 router.push('/write')，这里改成 <a href="/write">（可直接打开，无需 JS）；
	 * - motion/react 的入场与 hover/tap 缩放改用 app.css 的 .card-anim + data-shown / .card-hover；
	 * - 去掉 HomeDraggableLayer，位置公式照抄旧文件。
	 */

	const styles = cardStyles.writeButtons
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	let show = $state(false)

	// 旧站用 setTimeout(styles.order * ANIMATION_DELAY * 1000) 依次出场
	$effect(() => {
		const timer = setTimeout(() => (show = true), styles.order * ANIMATION_DELAY * 1000)
		return () => clearTimeout(timer)
	})

	const ox = offsetX !== null ? offsetX : CARD_SPACING + hiCardStyles.width / 2
	const oy =
		offsetY !== null
			? offsetY
			: -clockCardStyles.offset - styles.height - CARD_SPACING / 2 - clockCardStyles.height
</script>

{#if !(viewport.maxSM && viewport.init)}
	<div class="absolute flex items-center gap-4" style="left:calc(50% + {ox}px);top:calc(50% - 24px + {oy}px)">
		<a
			href="/write"
			class="brand-btn card-anim card-hover relative whitespace-nowrap"
			class:pointer-events-none={!show}
			data-shown={show}
			style="box-shadow:inset 0 0 12px rgba(255, 255, 255, 0.4)">
			{#if siteContent.enableChristmas}
				<img
					src="/images/christmas/snow-8.webp"
					alt="Christmas decoration"
					class="pointer-events-none absolute"
					style="width:60px;left:-2px;top:-4px;opacity:0.95" />
			{/if}

			<span class="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:size-full">{@html penSvg}</span>
			<span>写文章</span>
		</a>
	</div>
{/if}
