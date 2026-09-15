<script lang="ts">
	import dayjs from 'dayjs'
	import type { PageData } from './$types'
	import LikeButton from '$lib/components/LikeButton.svelte'

	let { data }: { data: PageData } = $props()

	const dateText = $derived(data.post.date ? dayjs(data.post.date).format('YYYY年 M月 D日') : '')
	const canonical = $derived(`${data.siteUrl}/blog/${data.post.slug}`)

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: data.post.title,
			description: data.post.summary || undefined,
			image: data.coverUrl ? [data.coverUrl] : undefined,
			datePublished: data.post.date,
			dateModified: data.post.date,
			inLanguage: 'zh-CN',
			keywords: data.post.tags.length ? data.post.tags.join(',') : undefined,
			mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
			author: { '@type': 'Person', name: 'Sonquain' },
			publisher: { '@type': 'Person', name: 'Sonquain' }
		})
	)
</script>

<svelte:head>
	<title>{data.post.title} | SelfWeb</title>
	{#if data.post.summary}<meta name="description" content={data.post.summary} />{/if}
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.post.title} />
	{#if data.post.summary}<meta property="og:description" content={data.post.summary} />{/if}
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content="SelfWeb" />
	{#if data.coverUrl}<meta property="og:image" content={data.coverUrl} />{/if}
	{#if data.post.date}<meta property="article:published_time" content={data.post.date} />{/if}
	<meta name="twitter:card" content={data.coverUrl ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={data.post.title} />
	{#if data.post.summary}<meta name="twitter:description" content={data.post.summary} />{/if}
	{#if data.coverUrl}<meta name="twitter:image" content={data.coverUrl} />{/if}
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<article class="py-6">
	<header class="mb-6">
		<a class="text-secondary hover:text-brand text-xs transition-colors" href="/blog">← 返回博客</a>
		<h1 class="mt-3 text-2xl font-bold sm:text-3xl">{data.post.title}</h1>
		<div class="text-secondary mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
			<span>{dateText}</span>
			{#if data.post.category}<span class="rounded-full bg-black/5 px-2 py-0.5">{data.post.category}</span>{/if}
			{#each data.post.tags as tag (tag)}<span class="rounded-full bg-black/5 px-2 py-0.5">#{tag}</span>{/each}
		</div>
		{#if data.post.cover}
			<img src={data.post.cover} alt={data.post.title} class="mt-5 w-full rounded-xl object-cover" />
		{/if}
	</header>

	<div class="lg:flex lg:gap-8">
		<div class="prose min-w-0 flex-1">
			{@html data.html}
		</div>

		{#if data.toc.length > 0}
			<aside class="mt-8 lg:mt-0 lg:w-56 lg:shrink-0">
				<div class="lg:sticky lg:top-6">
					<p class="text-secondary mb-2 text-xs font-medium tracking-wider">目录</p>
					<ul class="space-y-1 text-sm">
						{#each data.toc as item (item.id)}
							<li style={`padding-left: ${(item.level - 1) * 0.75}rem`}>
								<a class="text-secondary hover:text-brand transition-colors" href={`#${item.id}`}>{item.text}</a>
							</li>
						{/each}
					</ul>
				</div>
			</aside>
		{/if}
	</div>

	<div class="mt-8 flex justify-center">
		<LikeButton slug={data.post.slug} delay={300} />
	</div>
</article>
