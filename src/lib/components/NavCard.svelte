<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import Card from '$lib/components/Card.svelte'
	import { viewport } from '$lib/viewport.svelte'
	import { center } from '$lib/center.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { cn, CARD_SPACING } from '$lib/utils'
	import ScrollOutlineSVG from '$lib/svgs/scroll-outline.svg?raw'
	import ScrollFilledSVG from '$lib/svgs/scroll-filled.svg?raw'
	import AboutFilledSVG from '$lib/svgs/about-filled.svg?raw'
	import AboutOutlineSVG from '$lib/svgs/about-outline.svg?raw'
	import ShareFilledSVG from '$lib/svgs/share-filled.svg?raw'
	import ShareOutlineSVG from '$lib/svgs/share-outline.svg?raw'
	import WebsiteFilledSVG from '$lib/svgs/website-filled.svg?raw'
	import WebsiteOutlineSVG from '$lib/svgs/website-outline.svg?raw'

	/**
	 * 首页导航卡片（移植自旧站 src/components/nav-card.tsx）
	 *
	 * 与旧站的差异：
	 * - 移除 HomeDraggableLayer 包装与拖拽逻辑，直接用 <Card> 渲染在同一位置；
	 * - “我的项目”（/projects）导航项已在本次迁移中删除，不再包含；
	 * - motion 的 layoutId 弹簧动画改为 CSS transition；
	 * - next/image → 原生 <img>，next/link → <a>，SVG 组件 → ?raw + {@html}。
	 */

	const list = [
		{ icon: ScrollOutlineSVG, iconActive: ScrollFilledSVG, label: '近期文章', href: '/blog' },
		{ icon: AboutOutlineSVG, iconActive: AboutFilledSVG, label: '关于网站', href: '/about' },
		{ icon: ShareOutlineSVG, iconActive: ShareFilledSVG, label: '推荐分享', href: '/share' },
		{ icon: WebsiteOutlineSVG, iconActive: WebsiteFilledSVG, label: '优秀博客', href: '/bloggers' }
	]

	const extraSize = 8

	const styles = cardStyles.navCard
	const hiCardStyles = cardStyles.hiCard
	// JSON 里这两个字段是 null（未自定义偏移），显式收窄类型方便做 !== null 判断
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	let show = $state(false)
	let hoveredIndex = $state(0)

	const pathname = $derived(page.url.pathname)

	const activeIndex = $derived.by(() => {
		const index = list.findIndex(item => pathname === item.href)
		return index >= 0 ? index : undefined
	})

	// '/' → full，'/write' → mini，其它 → icons；小屏强制 icons
	const form = $derived(viewport.maxSM ? 'icons' : pathname === '/' ? 'full' : pathname === '/write' ? 'mini' : 'icons')

	const itemHeight = $derived(form === 'full' ? 52 : 28)

	const position = $derived.by(() => {
		if (form === 'full') {
			const x = offsetX !== null ? center.x + offsetX : center.x - hiCardStyles.width / 2 - styles.width - CARD_SPACING
			const y = offsetY !== null ? center.y + offsetY : center.y + hiCardStyles.height / 2 - styles.height
			return { x, y }
		}

		return { x: 24, y: 16 }
	})

	const size = $derived.by(() => {
		if (form === 'mini') return { width: 64, height: 64 }
		if (form === 'icons') return { width: 340, height: 64 }
		return { width: styles.width, height: styles.height }
	})

	// 小屏水平居中
	const placed = $derived(viewport.maxSM ? { x: center.x - size.width / 2, y: 16 } : position)

	// 旧站是 motion 的 layoutId 弹簧动画，这里改成同样的几何值 + CSS transition
	const highlightStyle = $derived(
		form === 'icons'
			? `left:${hoveredIndex * (itemHeight + 24) - extraSize}px;top:${-extraSize}px;width:${itemHeight + extraSize * 2}px;height:${itemHeight + extraSize * 2}px;`
			: `left:0;top:${hoveredIndex * (itemHeight + 8)}px;width:100%;height:${itemHeight}px;`
	)

	onMount(() => {
		show = true
	})

	// icons 形态下：进入页面后如果悬停项不是当前路由项，1.5s 后自动吸附过去
	$effect(() => {
		const target = activeIndex
		if (form !== 'icons' || target === undefined || hoveredIndex === target) return

		const timer = setTimeout(() => (hoveredIndex = target), 1500)
		return () => clearTimeout(timer)
	})
</script>

{#if show}
	<Card
		order={styles.order}
		width={size.width}
		height={size.height}
		x={placed.x}
		y={placed.y}
		class={cn(form !== 'full' && 'overflow-hidden', form === 'mini' && 'p-3', form === 'icons' && 'flex items-center gap-6 p-3')}>
		{#if form === 'full' && siteContent.enableChristmas}
			<img
				src="/images/christmas/snow-4.webp"
				alt="Christmas decoration"
				class="pointer-events-none absolute"
				style="width:160px;left:-18px;top:-20px;opacity:0.9" />
		{/if}

		<a class="flex items-center gap-3" href="/">
			<img
				src="/images/avatar.png"
				alt="avatar"
				width="40"
				height="40"
				class="rounded-full"
				style="box-shadow: 0 12px 20px -5px #E2D9CE" />
			{#if form === 'full'}
				<span class="font-averia mt-1 text-2xl leading-none font-medium">{siteContent.meta.title}</span>
			{/if}
			{#if form === 'full'}
				<span class="text-brand mt-2 text-xs font-medium">(开发中)</span>
			{/if}
		</a>

		{#if form === 'full' || form === 'icons'}
			{#if form !== 'icons'}
				<div class="text-secondary mt-6 text-sm uppercase">General</div>
			{/if}

			<div class={cn('relative mt-2 space-y-2', form === 'icons' && 'mt-0 flex items-center gap-6 space-y-0')}>
				<div
					class="absolute max-w-[230px] rounded-full border"
					style="{highlightStyle}background-image:linear-gradient(to right bottom, var(--color-border) 60%, var(--color-card) 100%);transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
				</div>

				{#each list as item, index (item.href)}
					<a
						href={item.href}
						class={cn(
							'text-secondary text-md relative z-10 flex items-center gap-3 rounded-full px-5 py-3',
							form === 'icons' && 'p-0'
						)}
						onmouseenter={() => (hoveredIndex = index)}>
						<div class="flex h-7 w-7 items-center justify-center">
							<span class={cn('nav-icon absolute h-7 w-7', hoveredIndex === index && 'text-brand')}>
								{@html hoveredIndex === index ? item.iconActive : item.icon}
							</span>
						</div>
						{#if form !== 'icons'}
							<span class={cn(index === hoveredIndex && 'text-primary font-medium')}>{item.label}</span>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</Card>
{/if}

<style>
	/* ?raw 注入的 svg 不带尺寸，交给外层容器决定 */
	.nav-icon :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
