<script lang="ts">
	import '../app.css'
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { startViewport, viewport } from '$lib/viewport.svelte'
	import { startCenter } from '$lib/center.svelte'
	import { themeStyleString, siteContent, cardStyles } from '$lib/config/site'
	import BlurredBubbles from '$lib/components/BlurredBubbles.svelte'
	import NavCard from '$lib/components/NavCard.svelte'
	import MusicCard from '$lib/components/MusicCard.svelte'

	let { children } = $props()

	const nav = [
		{ href: '/blog', label: '博客' },
		{ href: '/about', label: '关于' },
		{ href: '/share', label: '分享' },
		{ href: '/bloggers', label: '友链' },
		{ href: '/pictures', label: '图集' },
		{ href: '/snippets', label: '片段' },
		{ href: '/clock', label: '时钟' },
		{ href: '/image-toolbox', label: '图片工具' },
		{ href: '/live2d', label: 'Live2D' },
		{ href: '/wuthering-waves', label: '鸣潮' },
		{ href: '/svgs', label: '图标' }
	]

	const isHome = $derived(page.url.pathname === '/')
	const showMusic = $derived(!(viewport.maxSM && viewport.init) && cardStyles.musicCard?.enabled !== false)

	onMount(() => {
		const stopViewport = startViewport()
		const stopCenter = startCenter()

		// 文章 HTML 是构建期静态产物，这里只做事件委托，避免为每段代码块做水合
		const onClick = async (event: MouseEvent) => {
			const target = event.target as HTMLElement
			if (!target) return

			const copyBtn = target.closest('[data-code-copy]')
			if (copyBtn) {
				const block = copyBtn.closest('.code-block-wrapper') as HTMLElement | null
				const code = block?.dataset.code ?? ''
				try {
					await navigator.clipboard.writeText(code)
					copyBtn.textContent = '✓'
				} catch {
					copyBtn.textContent = '×'
				}
				setTimeout(() => (copyBtn.textContent = '⧉'), 1500)
				return
			}

			const toggleBtn = target.closest('[data-code-toggle]')
			if (toggleBtn) {
				const block = toggleBtn.closest('.code-block-wrapper') as HTMLElement | null
				if (!block) return
				const collapsed = block.classList.toggle('is-collapsed')
				toggleBtn.setAttribute('aria-expanded', String(!collapsed))
				toggleBtn.textContent = collapsed ? '▸' : '▾'
			}
		}

		document.addEventListener('click', onClick)

		return () => {
			document.removeEventListener('click', onClick)
			stopViewport()
			stopCenter()
		}
	})
</script>

<svelte:head>
	<!--
		主题变量必须走 {@html}：<style> 在 Svelte 里是组件样式块，内部不会做模板插值，
		直接写 {themeStyleString()} 会被当成 CSS 原样输出。
		title/description 由各页面自己声明，避免出现重复的 <title>。
	-->
	{@html `<style>:root{${themeStyleString()}}</style>`}
</svelte:head>

<BlurredBubbles colors={siteContent.backgroundColors} zIndex={0} />

{#if isHome}
	<!-- 首页：卡片仪表盘，导航由 NavCard 承担 -->
	<main class="relative z-10 h-full min-h-dvh">
		{@render children()}
		<NavCard />
		{#if showMusic}<MusicCard />{/if}
	</main>
{:else}
	<div class="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-6">
		<header class="flex flex-wrap items-center justify-between gap-3 py-6">
			<a class="text-lg font-bold tracking-wide" href="/">{siteContent.meta.title}</a>
			<nav class="text-secondary flex flex-wrap gap-x-4 gap-y-2 text-sm">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="hover:text-brand transition-colors"
						class:text-brand={page.url.pathname.startsWith(item.href)}
						aria-current={page.url.pathname.startsWith(item.href) ? 'page' : undefined}>{item.label}</a
					>
				{/each}
			</nav>
		</header>

		<main class="flex-1 pb-16">
			{@render children()}
		</main>

		<footer class="text-secondary border-t border-black/5 py-6 text-xs">
			<span>© {new Date().getFullYear()} Sonquain</span>
		</footer>
	</div>
{/if}
