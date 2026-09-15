<script module lang="ts">
	export interface Picture {
		id: string
		uploadedAt: string
		description?: string
		image?: string
		images?: string[]
	}

	export type PositionedItem = {
		x: number
		y: number
		rotation: number
	}
</script>

<script lang="ts">
	import { center } from '$lib/center.svelte'
	import FloatingImage from './FloatingImage.svelte'

	/**
	 * 随机散落图集（移植自旧站 src/app/pictures/components/random-layout.tsx）
	 *
	 * 布局思路完全沿用旧站：以视口中心为原点，用图片 URL 的哈希生成稳定角度/半径/旋转，
	 * 再叠加 localStorage 里的拖拽偏移。旧站的 useMemo 缓存换成一个模块级 Map，
	 * 保证「拖过/缩放窗口后位置不乱跳」。
	 */
	let { pictures }: { pictures: Picture[] } = $props()

	type UrlItem = {
		url: string
		groupIndex: number
		description?: string
		uploadedAt?: string
	}

	const positionCache = new Map<string, PositionedItem>()

	// 视口尺寸还没初始化时（SSR / 首帧）用默认值兜底，避免整页空白
	const width = $derived(center.width || 1280)
	const height = $derived(center.height || 800)

	const urls = $derived.by(() => {
		const result: UrlItem[] = []

		for (const [index, picture] of pictures.entries()) {
			if (picture.image) {
				result.push({
					url: picture.image,
					groupIndex: index,
					description: picture.description,
					uploadedAt: picture.uploadedAt
				})
			}

			for (const url of picture.images ?? []) {
				result.push({
					url,
					groupIndex: index,
					description: picture.description,
					uploadedAt: picture.uploadedAt
				})
			}
		}

		return result
	})

	const positioned = $derived(urls.map((item, index) => ({ ...item, index, position: getStablePosition(item.url, width, height) })))

	/** 用 uniqueId 的哈希生成稳定的位置（与旧站 getStablePosition 完全一致） */
	function getStablePosition(uniqueId: string, width: number, height: number): PositionedItem {
		// 只有拿到真实视口尺寸后才缓存，避免把 SSR 的兜底尺寸冻住
		const cacheable = center.width > 0
		const cached = positionCache.get(uniqueId)
		if (cached) return cached

		let hash = 0
		for (let i = 0; i < uniqueId.length; i++) {
			const char = uniqueId.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		const stableIndex = Math.abs(hash) % 10000

		const maxRadius = Math.min(width, height) / 2 - 100
		const goldenAngle = Math.PI * (3 - Math.sqrt(5))

		const t = (stableIndex % 1000) / 1000
		const radius = Math.pow(t, 0.8) * maxRadius
		const angle = stableIndex * goldenAngle

		const baseX = radius * Math.cos(angle)
		const baseY = radius * Math.sin(angle)

		const jitterSeed = Math.abs(hash) % 1000
		const jitterRadius = 12
		const jitterX = (jitterSeed % (jitterRadius * 2)) - jitterRadius
		const jitterY = ((jitterSeed * 7) % (jitterRadius * 2)) - jitterRadius
		const rotation = ((jitterSeed * 13) % 60) - 30

		const position: PositionedItem = { x: baseX + jitterX, y: baseY + jitterY, rotation }
		if (cacheable) positionCache.set(uniqueId, position)
		return position
	}
</script>

{#each positioned as item (item.url)}
	<FloatingImage
		url={item.url}
		index={item.index}
		groupIndex={item.groupIndex}
		position={item.position}
		description={item.description}
		uploadedAt={item.uploadedAt}
		delay={1000 + 200 * item.index}
	/>
{/each}
