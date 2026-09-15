<script lang="ts">
	import { cn } from '$lib/utils'
	import StarRating from '../StarRating.svelte'
	import type { Share } from './GridView.svelte'

	/** 分享卡片（移植自旧站 src/app/share/components/share-card.tsx） */
	let { share }: { share: Share } = $props()

	let expanded = $state(false)
	let shown = $state(false)
	let cardEl = $state<HTMLElement | null>(null)

	const tags = $derived(share.tags ?? [])
	const initial = $derived((share.name || '?').trim().charAt(0))

	// 旧站用 motion 的 whileInView（移动端直接 animate）做入场，这里统一用 IntersectionObserver + CSS 过渡
	$effect(() => {
		if (!cardEl) return
		if (typeof IntersectionObserver === 'undefined') {
			shown = true
			return
		}

		const observer = new IntersectionObserver(
			entries => {
				if (entries.some(entry => entry.isIntersecting)) {
					shown = true
					observer.disconnect()
				}
			},
			{ rootMargin: '0px 0px -10% 0px' }
		)

		observer.observe(cardEl)
		return () => observer.disconnect()
	})
</script>

<!-- card utility 自带 absolute（首页卡片用），这里跟旧站一样用 relative 变回文档流 -->
<div bind:this={cardEl} class="card card-anim group relative! block overflow-hidden" data-shown={shown}>
	<div>
		<div class="mb-4 flex items-center gap-4">
			<div class="group relative">
				{#if share.logo}
					<img src={share.logo} alt={share.name} class="h-16 w-16 rounded-xl object-cover" />
				{:else}
					<!-- logo 缺失（历史数据里出现过 blob: 临时地址）时退化为首字母占位，避免裂图 -->
					<div class="bg-secondary/10 text-secondary flex h-16 w-16 items-center justify-center rounded-xl text-xl font-bold">
						{initial}
					</div>
				{/if}
			</div>
			<div class="flex-1">
				<h3 class="group-hover:text-brand text-lg font-bold transition-colors">{share.name}</h3>
				<a
					href={share.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-secondary hover:text-brand mt-1 block max-w-[200px] truncate text-xs hover:underline">
					{share.url}
				</a>
			</div>
		</div>

		<StarRating stars={share.stars ?? 0} />

		<div class="mt-3 flex flex-wrap gap-1.5">
			{#each tags as tag (tag)}
				<span class="bg-secondary/10 rounded-full px-2.5 py-0.5 text-xs">{tag}</span>
			{/each}
		</div>

		<button type="button" onclick={() => (expanded = !expanded)} class="mt-3 block w-full text-left">
			<p
				class={cn(
					'text-sm leading-relaxed text-gray-600 transition-all duration-300',
					expanded ? 'line-clamp-none' : 'line-clamp-3'
				)}>
				{share.description}
			</p>
		</button>
	</div>
</div>
