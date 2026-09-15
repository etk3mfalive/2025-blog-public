<script lang="ts">
	import { cn } from '$lib/utils'

	/** 星级展示（移植自旧站 src/components/star-rating.tsx，只保留只读形态） */
	let { stars = 0, class: klass = '' }: { stars?: number; class?: string } = $props()
</script>

<div class={cn('flex items-center gap-0.5', klass)}>
	{#each [1, 2, 3, 4, 5] as index (index)}
		<svg width="16" height="16" viewBox="0 0 24 24" class={index <= stars ? 'fill-yellow-400' : 'fill-gray-300'}>
			<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
		</svg>
	{/each}
</div>
