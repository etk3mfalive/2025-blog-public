<script lang="ts">
	import RandomLayout from '$lib/components/pages/pictures/RandomLayout.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<svelte:head>
	<title>{data.title} | SelfWeb</title>
	<meta name="description" content={data.description} />
</svelte:head>

{#if data.pictures.length > 0}
	<!-- 散落的照片是 fixed 定位（旧站整屏拼贴），这里撑一个视口高度的占位，避免页脚压在照片上 -->
	<div class="min-h-[85vh]">
		<RandomLayout pictures={data.pictures} />
	</div>
{:else}
	<div class="text-secondary flex min-h-[70vh] items-center justify-center text-center text-sm">还没有上传图片。</div>
{/if}
