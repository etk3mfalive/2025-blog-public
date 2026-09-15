<script lang="ts">
	import GridView from '$lib/components/pages/share/GridView.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<svelte:head>
	<title>{data.title} | SelfWeb</title>
	<meta name="description" content={data.description} />
</svelte:head>

<GridView shares={data.shares} />
