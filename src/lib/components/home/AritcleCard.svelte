<script lang="ts">
	import dayjs from 'dayjs'
	import Card from '$lib/components/Card.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { CARD_SPACING } from '$lib/utils'

	/**
	 * 首页最新文章卡片（移植自旧站 src/app/(home)/aritcle-card.tsx，文件名拼写沿用旧站）
	 *
	 * 旧站用 useLatestBlog()（SWR 拉取 /api/blog-index）；这里改为由首页 load
	 * （src/routes/+page.ts 的 data.latestPost）通过 props 传入，组件自身不 fetch。
	 */
	let {
		post
	}: {
		post: { slug: string; title: string; date?: string; summary?: string; cover?: string } | null
	} = $props()

	const styles = cardStyles.articleCard
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons

	const ox =
		styles.offsetX !== null ? styles.offsetX : hiCardStyles.width / 2 - socialButtonsStyles.width - CARD_SPACING - styles.width
	const oy = styles.offsetY !== null ? styles.offsetY : hiCardStyles.height / 2 + CARD_SPACING

	const dateText = $derived(post?.date ? dayjs(post.date).format('YYYY/M/D') : '')
</script>

<Card order={styles.order} width={styles.width} height={styles.height} {ox} {oy} class="space-y-2 max-sm:static">
	{#if siteContent.enableChristmas}
		<img
			src="/images/christmas/snow-9.webp"
			alt="Christmas decoration"
			class="pointer-events-none absolute"
			style="width:140px;left:-12px;top:-16px;opacity:0.8"
		/>
	{/if}

	<h2 class="text-secondary text-sm">最新文章</h2>

	{#if post}
		<a href={`/blog/${post.slug}`} class="flex transition-opacity hover:opacity-80">
			{#if post.cover}
				<img src={post.cover} alt="cover" class="mr-3 h-12 w-12 shrink-0 rounded-xl border object-cover" />
			{:else}
				<div class="text-secondary mr-3 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/60">+</div>
			{/if}
			<div class="flex-1">
				<h3 class="line-clamp-1 text-sm font-medium">{post.title || post.slug}</h3>
				{#if post.summary}
					<p class="text-secondary mt-1 line-clamp-3 text-xs">{post.summary}</p>
				{/if}
				<p class="text-secondary mt-3 text-xs">{dateText}</p>
			</div>
		</a>
	{:else}
		<div class="flex h-[60px] items-center justify-center">
			<span class="text-secondary text-xs">暂无文章</span>
		</div>
	{/if}
</Card>
