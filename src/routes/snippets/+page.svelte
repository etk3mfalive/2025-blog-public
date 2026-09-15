<script lang="ts">
	import { untrack } from 'svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	// 构建期已经随机烘焙了一条（保证无 JS 时也有内容），客户端挂载后再抽一次
	let snippet = $state(untrack(() => data.snippet))

	$effect(() => {
		if (data.snippets.length > 1) {
			snippet = data.snippets[Math.floor(Math.random() * data.snippets.length)]
		}
	})
</script>

<svelte:head>
	<title>{data.title} | SelfWeb</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div class="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24">
	<div class="w-full max-w-3xl text-center">
		<p class="text-2xl leading-relaxed font-semibold">{snippet || '无'}</p>
	</div>
</div>
