<script lang="ts">
	import dayjs from 'dayjs'
	import { onMount } from 'svelte'
	import type { PageData } from './$types'
	import { cn } from '$lib/utils'

	let { data }: { data: PageData } = $props()

	type DisplayMode = 'year' | 'month' | 'category'

	const READ_KEY = 'selfweb:read-articles'

	let query = $state('')
	let activeTag = $state<string | null>(null)
	let activeCategory = $state<string | null>(null)
	let displayMode = $state<DisplayMode>('year')
	let readSlugs = $state<Set<string>>(new Set())

	onMount(() => {
		try {
			const raw = localStorage.getItem(READ_KEY)
			if (raw) readSlugs = new Set(JSON.parse(raw) as string[])
		} catch {
			readSlugs = new Set()
		}
	})

	function markRead(slug: string) {
		if (readSlugs.has(slug)) return
		const next = new Set(readSlugs)
		next.add(slug)
		readSlugs = next
		try {
			localStorage.setItem(READ_KEY, JSON.stringify([...next]))
		} catch {
			// 忽略隐私模式下的写入失败
		}
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase()
		return data.posts.filter(post => {
			if (activeTag && !(post.tags ?? []).includes(activeTag)) return false
			if (activeCategory && (post.category || '未分类') !== activeCategory) return false
			if (!q) return true
			return (
				post.title.toLowerCase().includes(q) ||
				(post.summary ?? '').toLowerCase().includes(q) ||
				(post.tags ?? []).some(tag => tag.toLowerCase().includes(q))
			)
		})
	})

	const grouped = $derived.by(() => {
		const map = new Map<string, typeof data.posts>()
		for (const post of filtered) {
			const date = post.date ? dayjs(post.date) : null
			let key: string
			if (displayMode === 'category') key = post.category || '未分类'
			else if (displayMode === 'month') key = date ? date.format('YYYY年 M月') : '未标注'
			else key = date ? date.format('YYYY年') : '未标注'

			const list = map.get(key) ?? []
			list.push(post)
			map.set(key, list)
		}
		return [...map.entries()]
	})

	const modeLabels: Array<{ value: DisplayMode; label: string }> = [
		{ value: 'year', label: '按年' },
		{ value: 'month', label: '按月' },
		{ value: 'category', label: '按分类' }
	]
</script>

<svelte:head>
	<title>博客 | SelfWeb</title>
	<meta name="description" content="Sonquain 的文章列表：日记、代码笔记与读书随笔。" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="博客 | SelfWeb" />
	<meta property="og:description" content="Sonquain 的文章列表：日记、代码笔记与读书随笔。" />
	<meta property="og:url" content="https://soq.app/blog" />
	<meta property="og:image" content="https://soq.app/images/avatar.png" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="flex flex-col gap-4 py-6 sm:flex-row sm:items-end sm:justify-between">
	<div>
		<h1 class="text-2xl font-bold">近期文章</h1>
		<p class="text-secondary mt-1 text-xs">共 {data.posts.length} 篇 · 已读 {readSlugs.size} 篇</p>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<input
			type="search"
			bind:value={query}
			placeholder="搜索标题、摘要或标签"
			class="card-rounded w-full border border-white/60 bg-white/70 px-3 py-2 text-sm outline-none sm:w-56"
		/>
		<div class="flex overflow-hidden rounded-xl border border-white/60 bg-white/70 text-xs">
			{#each modeLabels as mode (mode.value)}
				<button
					type="button"
					onclick={() => (displayMode = mode.value)}
					class="px-3 py-2 transition-colors"
					class:bg-brand={displayMode === mode.value}
					class:text-white={displayMode === mode.value}
					class:text-secondary={displayMode !== mode.value}>{mode.label}</button
				>
			{/each}
		</div>
	</div>
</div>

{#if data.tags.length > 0}
	<div class="mb-6 flex flex-wrap gap-2 text-xs">
		<button
			type="button"
			onclick={() => (activeTag = null)}
			class={cn('card-rounded border px-3 py-1 transition-colors', activeTag === null ? 'bg-brand text-white' : 'bg-white/70')}>全部标签</button
		>
		{#each data.tags as tag (tag)}
			<button
				type="button"
				onclick={() => (activeTag = activeTag === tag ? null : tag)}
				class={cn('card-rounded border px-3 py-1 transition-colors', activeTag === tag ? 'bg-brand text-white' : 'bg-white/70')}>#{tag}</button
			>
		{/each}
	</div>
{/if}

{#if data.categories.length > 0}
	<div class="mb-6 flex flex-wrap gap-2 text-xs">
		<button
			type="button"
			onclick={() => (activeCategory = null)}
			class={cn('card-rounded border px-3 py-1 transition-colors', activeCategory === null ? 'bg-brand text-white' : 'bg-white/70')}>全部分类</button
		>
		{#each data.categories as category (category)}
			<button
				type="button"
				onclick={() => (activeCategory = activeCategory === category ? null : category)}
				class={cn('card-rounded border px-3 py-1 transition-colors', activeCategory === category ? 'bg-brand text-white' : 'bg-white/70')}>{category}</button
			>
		{/each}
	</div>
{/if}

{#if filtered.length === 0}
	<p class="text-secondary text-sm">没有符合条件的文章。</p>
{/if}

{#each grouped as [groupLabel, posts] (groupLabel)}
	<section class="mb-10">
		<h2 class="text-secondary mb-3 text-sm font-medium tracking-wider">{groupLabel}</h2>
		<ul class="space-y-3">
			{#each posts as post (post.slug)}
				{@const isRead = readSlugs.has(post.slug)}
				<li class="card-rounded border border-white/60 bg-white/50 p-4 transition-colors hover:bg-white/80">
					<div class="flex items-start gap-4">
						{#if post.cover}
							<img src={post.cover} alt={post.title} class="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
						{/if}
						<div class="min-w-0 flex-1">
							<a
								class="hover:text-brand font-medium transition-colors"
								class:opacity-50={isRead}
								href={`/blog/${post.slug}`}
								onclick={() => markRead(post.slug)}>{post.title}</a
							>
							<div class="text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
								<span>{post.date ? dayjs(post.date).format('YYYY-MM-DD HH:mm') : ''}</span>
								{#if post.category}<span class="rounded-full bg-black/5 px-2 py-0.5">{post.category}</span>{/if}
								{#each post.tags ?? [] as tag (tag)}<span class="rounded-full bg-black/5 px-2 py-0.5">#{tag}</span>{/each}
								{#if isRead}<span class="rounded-full bg-black/5 px-2 py-0.5">已读</span>{/if}
							</div>
							{#if post.summary}
								<p class="text-secondary mt-2 line-clamp-2 text-sm">{post.summary}</p>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/each}
