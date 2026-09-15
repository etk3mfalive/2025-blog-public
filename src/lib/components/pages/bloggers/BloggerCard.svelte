<script lang="ts">
	import { cn } from '$lib/utils'
	import StarRating from '../StarRating.svelte'
	import type { Blogger } from './GridView.svelte'

	/** 友链卡片（移植自旧站 src/app/bloggers/components/blogger-card.tsx） */
	let { blogger }: { blogger: Blogger } = $props()

	let expanded = $state(false)
	let shown = $state(false)
	let cardEl = $state<HTMLElement | null>(null)

	const initial = $derived((blogger.name || '?').trim().charAt(0))

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
				{#if blogger.avatar}
					<img src={blogger.avatar} alt={blogger.name} class="h-16 w-16 rounded-full object-cover" />
				{:else}
					<div class="bg-secondary/10 text-secondary flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold">
						{initial}
					</div>
				{/if}
			</div>
			<div class="flex-1">
				<h3 class="group-hover:text-brand text-lg font-bold transition-colors">{blogger.name}</h3>
				<a
					href={blogger.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-secondary hover:text-brand mt-1 block max-w-[200px] truncate text-xs hover:underline">
					{blogger.url}
				</a>
			</div>
		</div>

		<StarRating stars={blogger.stars ?? 0} />

		<button type="button" onclick={() => (expanded = !expanded)} class="mt-3 block w-full text-left">
			<p
				class={cn(
					'text-sm leading-relaxed text-gray-600 transition-all duration-300',
					expanded ? 'line-clamp-none' : 'line-clamp-3'
				)}>
				{blogger.description}
			</p>
		</button>
	</div>
</div>
