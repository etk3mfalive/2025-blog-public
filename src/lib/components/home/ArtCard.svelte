<script lang="ts">
	import Card from '$lib/components/Card.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { CARD_SPACING } from '$lib/utils'

	/**
	 * 首页壁纸卡片（移植自旧站 src/app/(home)/art-card.tsx）
	 * 数据来自 site-content.json 的 artImages / currentArtImageId，编译期读取。
	 * 旧站用 useRouter().push 跳转，这里退回普通 <a href>（静态预渲染站点更稳）。
	 */
	const styles = cardStyles.artCard
	const hiCardStyles = cardStyles.hiCard

	const ox = styles.offsetX !== null ? styles.offsetX : -styles.width / 2
	const oy = styles.offsetY !== null ? styles.offsetY : -hiCardStyles.height / 2 - styles.height - CARD_SPACING

	const artImages = siteContent.artImages ?? []
	const currentId = siteContent.currentArtImageId
	const currentArt = (currentId ? artImages.find(item => item.id === currentId) : undefined) ?? artImages[0]
	const artUrl = currentArt?.url || '/images/art/cat.png'
</script>

<Card
	class="p-2 max-sm:static max-sm:translate-0"
	order={styles.order}
	width={styles.width}
	height={styles.height}
	{ox}
	{oy}
>
	{#if siteContent.enableChristmas}
		<img
			src="/images/christmas/snow-3.webp"
			alt="Christmas decoration"
			class="pointer-events-none absolute"
			style="width:160px;right:-8px;top:-16px;opacity:0.9"
		/>
	{/if}

	<a href="/pictures" class="block h-full w-full">
		<img src={artUrl} alt="wall art" class="h-full w-full rounded-[32px] object-cover" />
	</a>
</Card>
