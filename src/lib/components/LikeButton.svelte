<script lang="ts">
	import { onMount } from 'svelte'
	import { Heart } from 'lucide-svelte'
	import { cn } from '$lib/utils'

	/**
	 * 点赞按钮（移植自旧站 src/components/like-button.tsx）
	 *
	 * 与旧站的差异：
	 * - 去掉 SWR 与 BLOG_SLUG_KEY，改为 onMount 时 GET 一次 {count}；
	 * - toast → alert（本项目 P2 没有 toast 库）；
	 * - motion 粒子/缩放动画 → CSS keyframes + $state 粒子数组。
	 */

	type Particle = { id: number; x: number; y: number }

	let { slug = 'etq', class: klass = '', delay = 1000 }: { slug?: string; class?: string; delay?: number } = $props()

	/**
	 * 点赞后端地址。默认值是上游模板作者部署的 Worker（blog-liker.yysuni1001.workers.dev），
	 * 数据存在别人那里且没有 SLA；自建后请用 PUBLIC_LIKE_ENDPOINT 覆盖。
	 */
	const ENDPOINT = import.meta.env.PUBLIC_LIKE_ENDPOINT || 'https://blog-liker.yysuni1001.workers.dev/api/like'

	// 初始即可见：预渲染 HTML 里就有点赞按钮，避免无 JS 时缺失
	let show = $state(true)
	let liked = $state(false)
	let justLiked = $state(false)
	let count = $state<number | null>(null)
	let particles = $state<Particle[]>([])

	let particleTimer: ReturnType<typeof setTimeout> | null = null
	let justLikedTimer: ReturnType<typeof setTimeout> | null = null

	const likeUrl = $derived(`${ENDPOINT}?slug=${encodeURIComponent(slug)}`)

	async function fetchCount() {
		if (!slug) return
		try {
			const res = await fetch(likeUrl, { method: 'GET', cache: 'no-store' })
			if (!res.ok) return
			const data = await res.json().catch(() => ({}))
			if (typeof data?.count === 'number') count = data.count
		} catch {
			// ignore
		}
	}

	onMount(() => {
		// 按钮本身不再靠 JS 决定是否渲染（那样预渲染 HTML 里就没有点赞按钮），
		// 出场动画交给 .pop-in 关键帧 + 内联 animation-delay
		fetchCount()

		return () => {
			if (particleTimer !== null) clearTimeout(particleTimer)
			if (justLikedTimer !== null) clearTimeout(justLikedTimer)
		}
	})

	async function handleLike() {
		if (!slug) return
		liked = true
		justLiked = true

		if (justLikedTimer !== null) clearTimeout(justLikedTimer)
		justLikedTimer = setTimeout(() => (justLiked = false), 600)

		// Create particle effects
		particles = Array.from({ length: 6 }, (_, i) => ({
			id: Date.now() + i,
			x: Math.random() * 60 - 30,
			y: Math.random() * 60 - 30
		}))

		// Clear particles after animation
		if (particleTimer !== null) clearTimeout(particleTimer)
		particleTimer = setTimeout(() => (particles = []), 1000)

		try {
			const res = await fetch(likeUrl, { method: 'POST' })
			const data = await res.json().catch(() => ({}))
			if (data.reason === 'rate_limited') alert('谢谢啦😘，今天已经不能再点赞啦💕')
			count = typeof data?.count === 'number' ? data.count : (count ?? 0) + 1
		} catch {
			// ignore
		}
	}
</script>

{#if show}
	<button
		type="button"
		aria-label="Like this post"
		onclick={handleLike}
		style="animation-delay:{delay}ms"
		class={cn('card heartbeat-container like-btn pop-in relative overflow-visible rounded-full p-3', klass)}>
		{#each particles as particle (particle.id)}
			<span
				class="particle pointer-events-none absolute inset-0 flex items-center justify-center"
				style="--px:{particle.x}px;--py:{particle.y}px">
				<Heart class="fill-rose-400 text-rose-400" size={12} />
			</span>
		{/each}

		{#if typeof count === 'number'}
			<span
				class={cn(
					'badge-pop absolute -top-2 left-9 min-w-6 rounded-full px-1.5 py-1 text-center text-xs text-white tabular-nums',
					liked ? 'bg-rose-400' : 'bg-gray-300'
				)}>
				{count}
			</span>
		{/if}

		<span class={cn('block', justLiked && 'heart-pop')}>
			<Heart class={cn('heartbeat', liked ? 'fill-rose-400 text-rose-400' : 'fill-rose-200 text-rose-200')} size={28} />
		</span>
	</button>
{/if}

<style>
	/* motion 的 whileHover / whileTap / initial 全部改成 CSS */
	.like-btn {
		transition: transform 0.2s ease;
	}

	.like-btn:hover {
		transform: scale(1.05);
	}

	.like-btn:active {
		transform: scale(0.95);
	}

	.pop-in {
		animation: like-pop-in 0.3s ease-out;
	}

	@keyframes like-pop-in {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.badge-pop {
		animation: like-badge-pop 0.3s ease-out;
	}

	@keyframes like-badge-pop {
		from {
			transform: scale(0.4);
		}
		to {
			transform: scale(1);
		}
	}

	.heart-pop {
		animation: like-heart-pop 0.6s ease-out;
	}

	@keyframes like-heart-pop {
		0% {
			transform: scale(1) rotate(0deg);
		}
		30% {
			transform: scale(1.4) rotate(-10deg);
		}
		60% {
			transform: scale(1.4) rotate(10deg);
		}
		100% {
			transform: scale(1) rotate(0deg);
		}
	}

	.particle {
		animation: like-particle 0.8s ease-out forwards;
	}

	@keyframes like-particle {
		0% {
			opacity: 1;
			transform: translate(0, 0) scale(0);
		}
		50% {
			opacity: 1;
			transform: translate(calc(var(--px) / 2), calc(var(--py) / 2)) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(var(--px), var(--py)) scale(0.8);
		}
	}
</style>
