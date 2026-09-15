<script lang="ts">
	import type { PageData } from './$types'
	import { viewport } from '$lib/viewport.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'

	import ArtCard from '$lib/components/home/ArtCard.svelte'
	import HiCard from '$lib/components/home/HiCard.svelte'
	import ClockCard from '$lib/components/home/ClockCard.svelte'
	import CalendarCard from '$lib/components/home/CalendarCard.svelte'
	import SocialButtons from '$lib/components/home/SocialButtons.svelte'
	import ShareCard from '$lib/components/home/ShareCard.svelte'
	import AritcleCard from '$lib/components/home/AritcleCard.svelte'
	import WriteButtons from '$lib/components/home/WriteButtons.svelte'
	import LikePosition from '$lib/components/home/LikePosition.svelte'
	import HatCard from '$lib/components/home/HatCard.svelte'
	import BeianCard from '$lib/components/home/BeianCard.svelte'

	let { data }: { data: PageData } = $props()

	const showDesktopOnly = $derived(!(viewport.maxSM && viewport.init))
	const enabled = (key: keyof typeof cardStyles) => cardStyles[key]?.enabled !== false
</script>

<svelte:head>
	<title>{siteContent.meta.title}</title>
	<meta name="description" content={siteContent.meta.description} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteContent.meta.title} />
	<meta property="og:title" content={siteContent.meta.title} />
	<meta property="og:description" content={siteContent.meta.description} />
	<meta property="og:url" content="https://soq.app/" />
	<meta property="og:image" content="https://soq.app/images/avatar.png" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={siteContent.meta.title} />
	<meta name="twitter:description" content={siteContent.meta.description} />
	<meta name="twitter:image" content="https://soq.app/images/avatar.png" />
</svelte:head>

<div class="max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-6 max-sm:pt-28 max-sm:pb-20">
	{#if enabled('artCard')}<ArtCard />{/if}
	{#if enabled('hiCard')}<HiCard />{/if}
	{#if showDesktopOnly && enabled('clockCard')}<ClockCard />{/if}
	{#if showDesktopOnly && enabled('calendarCard')}<CalendarCard />{/if}
	{#if enabled('socialButtons')}<SocialButtons />{/if}
	{#if showDesktopOnly && enabled('shareCard')}<ShareCard />{/if}
	{#if enabled('articleCard')}<AritcleCard post={data.latestPost} />{/if}
	{#if showDesktopOnly && enabled('writeButtons')}<WriteButtons />{/if}
	{#if enabled('likePosition')}<LikePosition />{/if}
	{#if enabled('hatCard')}<HatCard />{/if}
	{#if enabled('beianCard')}<BeianCard />{/if}
</div>
