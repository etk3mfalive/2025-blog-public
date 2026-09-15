<script lang="ts">
	import LikeButton from '$lib/components/LikeButton.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { ANIMATION_DELAY, CARD_SPACING } from '$lib/utils'

	/**
	 * 点赞按钮的位置壳（移植自旧站 src/app/(home)/like-position.tsx）
	 *
	 * - 按旧文件的公式放在 cardStyles.likePosition 位置；
	 * - 旧站默认 slug 是 etk3mfalive，这里固定用 sonquain；
	 * - 移除 HomeDraggableLayer，motion.div 改为内联 left/top 的普通 div。
	 */

	const styles = cardStyles.likePosition
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons
	const musicCardStyles = cardStyles.musicCard
	const shareCardStyles = cardStyles.shareCard
	// JSON 里偏移默认是 null，显式收窄类型方便做 !== null 判断
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	const ox = offsetX !== null ? offsetX : hiCardStyles.width / 2 - socialButtonsStyles.width + shareCardStyles.width + CARD_SPACING
	const oy =
		offsetY !== null
			? offsetY
			: hiCardStyles.height / 2 +
					CARD_SPACING +
					socialButtonsStyles.height +
					CARD_SPACING +
					musicCardStyles.height +
					CARD_SPACING
</script>

<div class="absolute max-sm:static" style="left:calc(50% + {ox}px);top:calc(50% - 24px + {oy}px)">
	{#if siteContent.enableChristmas}
		<img
			src="/images/christmas/snow-13.webp"
			alt="Christmas decoration"
			class="pointer-events-none absolute"
			style="width:40px;left:-4px;top:-4px;opacity:0.9" />
	{/if}

	<LikeButton slug="sonquain" delay={shareCardStyles.order * ANIMATION_DELAY * 1000} />
</div>
