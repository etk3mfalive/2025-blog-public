<script module lang="ts">
	/** 所有实例共享的 z-index 计数器（旧站模块级 lastZIndex，点击后置顶用） */
	let zCounter = 1000

	function loadSavedOffset(key: string): { x: number; y: number } {
		if (typeof localStorage === 'undefined') return { x: 0, y: 0 }
		try {
			const saved = localStorage.getItem(`picture-offset-${key}`)
			if (saved) {
				const parsed = JSON.parse(saved)
				return { x: parsed.x || 0, y: parsed.y || 0 }
			}
		} catch (error) {
			console.error('Failed to load saved offset:', error)
		}
		return { x: 0, y: 0 }
	}

	function saveOffset(key: string, offset: { x: number; y: number }) {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.setItem(`picture-offset-${key}`, JSON.stringify(offset))
		} catch (error) {
			console.error('Failed to save offset:', error)
		}
	}

	function formatUploadedAt(uploadedAt?: string) {
		if (!uploadedAt) return ''
		const date = new Date(uploadedAt)
		if (Number.isNaN(date.getTime())) return uploadedAt

		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		const hours = String(date.getHours()).padStart(2, '0')
		const minutes = String(date.getMinutes()).padStart(2, '0')

		return `${year}-${month}-${day} ${hours}:${minutes}`
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte'
	import { center } from '$lib/center.svelte'
	import { viewport } from '$lib/viewport.svelte'
	import { siteContent } from '$lib/config/site'
	import { cn } from '$lib/utils'
	import type { PositionedItem } from './RandomLayout.svelte'

	/**
	 * 单张浮动照片（移植自旧站 random-layout.tsx 里的 FloatingImage）
	 *
	 * motion 的 drag / whileInView 换成 pointer 事件 + CSS 过渡：
	 * - 拖拽偏移写进 localStorage（picture-offset-<url>），下次访问还原；
	 * - 短按（<150ms 且没移动）放大到视口内，桌面端点背景、移动端再点一次缩小；
	 * - 入场按 delay 依次淡入 scale 0.6 → 1。
	 */
	const TOP_Z = 9999

	let {
		url,
		index,
		groupIndex = 0,
		position,
		description,
		uploadedAt,
		delay = 0
	}: {
		url: string
		index: number
		groupIndex?: number
		position: PositionedItem
		description?: string
		uploadedAt?: string
		delay?: number
	} = $props()

	let shown = $state(false)
	let hovered = $state(false)
	let isZoomed = $state(false)
	let dragging = $state(false)
	// z / offset 都只取一次初始值（父组件按 url 做 key，url 变了就是新实例）
	let z = $state(untrack(() => index))
	let naturalWidth = $state(0)
	let naturalHeight = $state(0)
	let zoomSize = $state<{ width: number; height: number } | null>(null)
	let imgEl = $state<HTMLImageElement | null>(null)
	let offset = $state(untrack(() => loadSavedOffset(url)))

	let startPoint = { x: 0, y: 0 }
	let startOffset = { x: 0, y: 0 }
	let startTime = 0
	let moved = false

	$effect(() => {
		const timer = setTimeout(() => (shown = true), delay)
		return () => clearTimeout(timer)
	})

	// 图片可能在 hydration 之前就已经加载完，这时 onload 不会再触发
	$effect(() => {
		if (naturalWidth === 0 && imgEl?.complete && imgEl.naturalWidth > 0) {
			naturalWidth = imgEl.naturalWidth
			naturalHeight = imgEl.naturalHeight
		}
	})

	// center 还没初始化时（SSR / 首帧）用视口中心兜底
	const cx = $derived(center.centerX || 640)
	const cy = $derived(center.centerY || 400)

	const baseWidth = $derived(viewport.maxSM ? 150 : 200)
	const ratio = $derived(naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1)
	const clampedRatio = $derived(Math.min(Math.max(ratio, 2 / 3), 3 / 2))
	const displayWidth = $derived(baseWidth)
	const displayHeight = $derived(baseWidth / clampedRatio)

	const frameWidth = $derived(isZoomed ? (zoomSize?.width ?? displayWidth) : displayWidth)
	const frameHeight = $derived(isZoomed ? (zoomSize?.height ?? displayHeight) : displayHeight)
	const scale = $derived(isZoomed ? 1 : shown ? (hovered && !dragging ? 1.05 : 1) : 0.6)

	const noteColor = $derived(siteContent.backgroundColors[groupIndex % siteContent.backgroundColors.length] ?? '#FCC841')

	const classes = $derived(
		cn(
			'fixed origin-center cursor-pointer touch-none border-white bg-white shadow-xl select-none',
			'transition-[left,top,width,height,transform,opacity] duration-300 ease-out',
			isZoomed ? 'border-[12px] sm:border-[24px]' : 'border-[8px]'
		)
	)

	const style = $derived(
		[
			`left:${isZoomed ? cx : cx + position.x}px`,
			`top:${isZoomed ? cy : cy + position.y}px`,
			`width:${frameWidth}px`,
			`height:${frameHeight}px`,
			`z-index:${isZoomed ? TOP_Z : z}`,
			`transform:translate(-50%, -50%) translate(${isZoomed ? 0 : offset.x}px, ${isZoomed ? 0 : offset.y}px) rotate(${
				isZoomed ? 0 : position.rotation
			}deg) scale(${scale})`,
			`opacity:${isZoomed || shown ? 1 : 0}`,
			// 拖拽时不要过渡，否则会跟手迟滞（内联样式优先级高于 class）
			dragging ? 'transition:none' : ''
		].join(';')
	)

	function handleImageLoad(event: Event) {
		const img = event.currentTarget as HTMLImageElement
		naturalWidth = img.naturalWidth
		naturalHeight = img.naturalHeight
	}

	function enterZoom() {
		if (typeof window === 'undefined') return

		const width = naturalWidth || displayWidth
		const height = naturalHeight || displayHeight
		const maxWidth = window.innerWidth - 48
		const maxHeight = window.innerHeight - 48
		const fit = Math.min(maxWidth / width, maxHeight / height, 1)

		zoomSize = { width: width * fit, height: height * fit }
		isZoomed = true
	}

	function exitZoom() {
		isZoomed = false
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return

		startTime = event.timeStamp
		moved = false
		startPoint = { x: event.clientX, y: event.clientY }
		startOffset = { ...offset }

		// 放大态不拖拽，只保留「移动端再点一下缩小」的短按判定
		if (isZoomed) return

		z = ++zCounter
		dragging = true
		;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return

		const dx = event.clientX - startPoint.x
		const dy = event.clientY - startPoint.y
		if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
		offset = { x: startOffset.x + dx, y: startOffset.y + dy }
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return
		event.preventDefault()
		if (isZoomed) exitZoom()
		else enterZoom()
	}

	function onPointerUp(event: PointerEvent) {
		const duration = event.timeStamp - startTime

		if (!moved && duration <= 150) {
			if (isZoomed) {
				if (viewport.maxSM) exitZoom()
			} else {
				enterZoom()
			}
			dragging = false
			return
		}

		if (!dragging) return
		dragging = false
		saveOffset(url, offset)
	}
</script>

{#if isZoomed}
	<button
		type="button"
		aria-label="关闭预览"
		onclick={exitZoom}
		class="bg-card fixed inset-0 cursor-default backdrop-blur-xl"
		style="z-index:{TOP_Z - 1}"
	></button>
{/if}

<div
	class={classes}
	style={style}
	role="button"
	tabindex="0"
	aria-label={description ? `查看照片：${description}` : '查看照片'}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => {
		if (!dragging) hovered = false
	}}
	onkeydown={onKeyDown}
>
	<img
		bind:this={imgEl}
		src={url}
		alt={description || '照片'}
		draggable="false"
		onload={handleImageLoad}
		class="h-full w-full object-cover select-none"
	/>
</div>

{#if isZoomed && description}
	<!-- 放大时的说明卡片（旧站可拖拽，这里固定在视口右侧/移动端右上角） -->
	<div
		class="fixed min-h-[150px] w-[200px] p-6 shadow"
		style="background-color:{noteColor};z-index:{TOP_Z + 1};right:{viewport.maxSM ? 12 : Math.round(
			cx / 3
		)}px;top:{viewport.maxSM ? 12 : cy}px"
	>
		<div class="text-secondary mb-2 text-xs">{formatUploadedAt(uploadedAt)}</div>
		<div class="text-sm">{description}</div>
	</div>
{/if}
