<script lang="ts">
	/**
	 * Markdown 预览：与博客文章页共用 $lib/markdown 的同构渲染（shiki / katex 动态 import）。
	 *
	 * 正文里的 `(local-image:<id>)` 占位符在发布时才会被替换成真实路径，
	 * 所以预览前先用 `resolveLocalImage` 把它们换成 blob/原始 URL，否则图片是碎的。
	 */
	import { renderMarkdown } from '$lib/markdown'

	type Props = {
		markdown: string
		title?: string
		slug?: string
		summary?: string
		date?: string
		category?: string
		tags?: string[]
		coverUrl?: string | null
		/** 把 local-image 占位符换成可显示的地址；返回 null 表示认不出这个 id */
		resolveLocalImage?: (id: string) => string | null
	}

	let { markdown, title, slug, summary, date, category, tags = [], coverUrl = null, resolveLocalImage }: Props = $props()

	let html = $state('')
	let rendering = $state(false)
	let renderError = $state<string | null>(null)

	const resolvedMarkdown = $derived.by(() => {
		if (!markdown) return ''
		if (!resolveLocalImage) return markdown
		return markdown.replace(/\(local-image:([^)\s]+)\)/g, (whole, id: string) => {
			const url = resolveLocalImage(id)
			return url ? `(${url})` : whole
		})
	})

	$effect(() => {
		const source = resolvedMarkdown
		let cancelled = false
		rendering = true
		renderError = null

		renderMarkdown(source)
			.then(result => {
				if (cancelled) return
				html = result.html
			})
			.catch(error => {
				if (cancelled) return
				renderError = error instanceof Error ? error.message : String(error)
			})
			.finally(() => {
				if (!cancelled) rendering = false
			})

		return () => {
			cancelled = true
		}
	})
</script>

<section class="card card-rounded relative w-full">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h2 class="text-sm font-medium">预览</h2>
		<span class="text-secondary text-xs">
			{rendering ? '渲染中…' : '与文章页同一套 Markdown 渲染器'}
		</span>
	</div>

	{#if coverUrl}
		<img src={coverUrl} alt="封面预览" class="mt-4 max-h-56 w-full rounded-2xl object-cover" />
	{/if}

	<h3 class="mt-4 text-xl font-bold">{title || '（未填写标题）'}</h3>
	<div class="text-secondary mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
		<span>{date || '未设置日期'}</span>
		{#if category}<span class="rounded-full bg-black/5 px-2 py-0.5">{category}</span>{/if}
		{#each tags.filter(Boolean) as tag (tag)}<span class="rounded-full bg-black/5 px-2 py-0.5">#{tag}</span>{/each}
		{#if slug}<span class="rounded-full bg-black/5 px-2 py-0.5">/blog/{slug}</span>{/if}
	</div>

	{#if summary}
		<p class="text-secondary mt-3 rounded-xl border bg-white/50 p-3 text-sm leading-relaxed">{summary}</p>
	{/if}

	{#if renderError}
		<p class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">预览渲染失败：{renderError}</p>
	{:else if !markdown.trim()}
		<p class="text-secondary mt-4 text-sm">正文还是空的。</p>
	{:else}
		<div class="prose mt-4 max-w-none">{@html html}</div>
	{/if}
</section>
