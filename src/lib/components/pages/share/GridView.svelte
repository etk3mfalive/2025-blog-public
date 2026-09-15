<script module lang="ts">
	export interface Share {
		name: string
		logo?: string
		url: string
		description?: string
		tags?: string[]
		stars?: number
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils'
	import ShareCard from './ShareCard.svelte'

	/** 分享网格（移植自旧站 src/app/share/grid-view.tsx，去掉编辑态） */
	let { shares }: { shares: Share[] } = $props()

	let searchTerm = $state('')
	let selectedTag = $state('all')

	const allTags = $derived(Array.from(new Set(shares.flatMap(share => share.tags ?? []))))

	const filteredShares = $derived(
		shares.filter(share => {
			const keyword = searchTerm.trim().toLowerCase()
			const matchesSearch =
				!keyword ||
				share.name.toLowerCase().includes(keyword) ||
				(share.description ?? '').toLowerCase().includes(keyword)
			const matchesTag = selectedTag === 'all' || (share.tags ?? []).includes(selectedTag)
			return matchesSearch && matchesTag
		})
	)

	const tagClass = (active: boolean) =>
		cn(
			'rounded-full px-4 py-1.5 text-sm transition-colors',
			active ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
		)
</script>

<div class="w-full py-6">
	<div class="mb-8 space-y-4">
		<input
			type="text"
			placeholder="搜索资源..."
			bind:value={searchTerm}
			class="focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
		/>

		<div class="flex flex-wrap justify-center gap-2">
			<button type="button" onclick={() => (selectedTag = 'all')} class={tagClass(selectedTag === 'all')}>全部</button>
			{#each allTags as tag (tag)}
				<button type="button" onclick={() => (selectedTag = tag)} class={tagClass(selectedTag === tag)}>{tag}</button>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredShares as share (share.url)}
			<ShareCard {share} />
		{/each}
	</div>

	{#if filteredShares.length === 0}
		<div class="mt-12 text-center text-gray-500">
			<p>没有找到相关资源</p>
		</div>
	{/if}
</div>
