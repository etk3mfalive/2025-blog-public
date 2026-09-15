<script lang="ts">
	import Card from '$lib/components/Card.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { CARD_SPACING } from '$lib/utils'
	import shareList from '$lib/data/share.json'

	/**
	 * 首页“随机推荐”卡片（移植自旧站 src/app/(home)/share-card.tsx）
	 * 旧站在 useEffect 里随机；这里在模块初始化时选一次，服务端预渲染与客户端水合结果一致。
	 */
	type ShareItem = {
		name: string
		url: string
		logo: string
		description: string
		tags: string[]
		stars: number
	}

	const styles = cardStyles.shareCard
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons

	const list = shareList as ShareItem[]
	const randomItem = list[Math.floor(Math.random() * list.length)] ?? null

	const ox = styles.offsetX !== null ? styles.offsetX : hiCardStyles.width / 2 - socialButtonsStyles.width
	const oy =
		styles.offsetY !== null
			? styles.offsetY
			: hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING
</script>

{#if randomItem}
	<Card order={styles.order} width={styles.width} height={styles.height} {ox} {oy}>
		{#if siteContent.enableChristmas}
			<img
				src="/images/christmas/snow-12.webp"
				alt="Christmas decoration"
				class="pointer-events-none absolute"
				style="width:120px;left:-12px;top:-12px;opacity:0.8"
			/>
		{/if}

		<h2 class="text-secondary text-sm">随机推荐</h2>

		<a href="/share" class="mt-2 block space-y-2">
			<div class="flex items-center">
				<div class="relative mr-3 h-12 w-12 shrink-0 overflow-hidden rounded-xl">
					{#if randomItem.logo}
						<img src={randomItem.logo} alt={randomItem.name} class="h-full w-full object-contain" />
					{:else}
						<div class="text-secondary grid h-full w-full place-items-center text-lg font-medium">
							{randomItem.name.slice(0, 1)}
						</div>
					{/if}
				</div>
				<h3 class="text-sm font-medium">{randomItem.name}</h3>
			</div>

			<p class="text-secondary line-clamp-3 text-xs">{randomItem.description}</p>
		</a>
	</Card>
{/if}
