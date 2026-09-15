<script module lang="ts">
	export type BloggerStatus = 'recent' | 'disconnected'

	export interface Blogger {
		name: string
		avatar?: string
		url: string
		description?: string
		stars?: number
		/** 数据里只有部分条目带 status，缺省视为 recent */
		status?: string
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils'
	import BloggerCard from './BloggerCard.svelte'

	/** 友链网格（移植自旧站 src/app/bloggers/grid-view.tsx，去掉编辑态） */
	let { bloggers }: { bloggers: Blogger[] } = $props()

	let searchTerm = $state('')
	let selectedCategory = $state<BloggerStatus>('recent')

	const filteredBloggers = $derived(
		bloggers.filter(blogger => {
			const status = blogger.status ?? 'recent'
			const keyword = searchTerm.trim().toLowerCase()
			const matchesCategory = status === selectedCategory
			const matchesSearch =
				!keyword ||
				blogger.name.toLowerCase().includes(keyword) ||
				(blogger.description ?? '').toLowerCase().includes(keyword)
			return matchesCategory && matchesSearch
		})
	)

	const categoryClass = (active: boolean) =>
		cn(
			'rounded-full px-4 py-1.5 text-sm transition-colors',
			active ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
		)

	const categories: { value: BloggerStatus; label: string }[] = [
		{ value: 'recent', label: '近期更新' },
		{ value: 'disconnected', label: '长期失联' }
	]
</script>

<div class="w-full py-6">
	<div class="mb-8 space-y-4">
		<input
			type="text"
			placeholder="搜索博主..."
			bind:value={searchTerm}
			class="focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
		/>

		<div class="flex flex-wrap justify-center gap-2">
			{#each categories as item (item.value)}
				<button type="button" onclick={() => (selectedCategory = item.value)} class={categoryClass(selectedCategory === item.value)}>
					{item.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredBloggers as blogger (blogger.url)}
			<BloggerCard {blogger} />
		{/each}
	</div>

	{#if filteredBloggers.length === 0}
		<div class="mt-12 text-center text-gray-500">
			<p>没有找到相关博主</p>
		</div>
	{/if}
</div>
