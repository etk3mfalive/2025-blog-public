<script lang="ts">
	import Card from '$lib/components/Card.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { CARD_SPACING } from '$lib/utils'

	/**
	 * 备案信息卡片（移植自旧站 src/app/(home)/beian-card.tsx）
	 *
	 * 迁移差异：
	 * - 去掉 HomeDraggableLayer，位置公式照抄旧文件；
	 * - 旧站在 beian.text 为空时 return null；这里按迁移要求改为渲染一个不显眼的占位。
	 *   注意 cardStyles.beianCard.enabled 目前是 false，首页不会渲染它（组件本身可正常工作）。
	 */

	const styles = cardStyles.beianCard
	const hiCardStyles = cardStyles.hiCard
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	const ox = offsetX !== null ? offsetX : hiCardStyles.width / 2 - styles.width + 200
	const oy = offsetY !== null ? offsetY : hiCardStyles.height / 2 + CARD_SPACING + 180

	const beian = siteContent.beian
	const text = $derived(beian?.text?.trim() ?? '')
	const link = beian?.link ?? ''
</script>

<Card
	order={styles.order}
	width={styles.width}
	height={styles.height}
	{ox}
	{oy}
	class="flex items-center justify-center max-sm:static">
	{#if text}
		{#if link}
			<a
				href={link}
				target="_blank"
				rel="noopener noreferrer"
				class="text-secondary text-xs transition-opacity hover:opacity-80">{text}</a>
		{:else}
			<span class="text-secondary text-xs">{text}</span>
		{/if}
	{:else}
		<!-- 配置里 beian.text 目前为空：不显眼的占位（旧站此处直接 return null） -->
		<span class="text-secondary/50 text-xs">备案信息未配置</span>
	{/if}
</Card>
