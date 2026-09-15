<script lang="ts">
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let query = $state('')
	let copiedLabel = $state<string | null>(null)

	const filteredItems = $derived.by(() => {
		const keyword = query.trim().toLowerCase()
		if (!keyword) return data.items
		return data.items.filter(item => item.label.toLowerCase().includes(keyword))
	})

	function toPascalCase(input: string) {
		return input
			.split(/[^a-zA-Z0-9]+/)
			.filter(Boolean)
			.map(part => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	}

	/** 旧站复制的是 React 版 import，这里改成新项目的 ?raw 写法 */
	async function handleCopy(label: string) {
		const varName = toPascalCase(label)
		const importCmd = varName
			? `import ${varName} from '$lib/svgs/${label}.svg?raw'`
			: `import icon from '$lib/svgs/${label}.svg?raw'`

		try {
			await navigator.clipboard.writeText(importCmd)
			copiedLabel = label
			setTimeout(() => {
				if (copiedLabel === label) copiedLabel = null
			}, 1500)
		} catch {
			// 剪贴板不可用时静默失败（与旧站一致）
		}
	}
</script>

<svelte:head>
	<title>{data.title} | SelfWeb</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div class="w-full space-y-4 py-6">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-xl font-medium">SVG Gallery</h1>
		<input
			type="text"
			bind:value={query}
			placeholder="Filter icons..."
			class="bg-card h-9 w-56 rounded-md border px-3 text-sm outline-none"
		/>
	</div>

	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
		{#each filteredItems as item (item.label)}
			<button
				type="button"
				onclick={() => handleCopy(item.label)}
				title="Click to copy import command"
				class="bg-card group relative flex flex-col items-center rounded-md border p-3 text-left transition-colors hover:bg-slate-800/5"
			>
				<div class="flex h-12 items-center justify-center [&>svg]:h-8 [&>svg]:w-8">{@html item.raw}</div>
				<div title={item.label} class="text-secondary mt-2 w-full overflow-hidden text-center text-xs break-all text-ellipsis whitespace-nowrap">
					{item.label}
				</div>
				{#if copiedLabel === item.label}
					<span class="bg-primary/90 pointer-events-none absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium text-white">
						Copied
					</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if filteredItems.length === 0}
		<p class="text-secondary py-8 text-center text-sm">没有匹配的图标</p>
	{/if}
</div>
