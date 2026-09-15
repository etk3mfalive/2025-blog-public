<script lang="ts">
	import { page } from '$app/state'
	import Card from '$lib/components/Card.svelte'
	import { center } from '$lib/center.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { cn, CARD_SPACING } from '$lib/utils'
	import MusicSVG from '$lib/svgs/music.svg?raw'
	import PlaySVG from '$lib/svgs/play.svg?raw'
	import { Pause } from 'lucide-svelte'

	/**
	 * 音乐播放卡片（移植自旧站 src/components/music-card.tsx）
	 *
	 * 与旧站的差异：
	 * - 音频固定为 /music/Overdose.m4a（构建前由脚本同步到 static/music/）；
	 * - 播放/暂停改用页面内的 <audio> 元素 + Svelte 状态，去掉 new Audio() / useRef 写法；
	 * - 单曲播放结束后会暂停并回到 0%（旧站 ended 时仍显示播放中的图标）；
	 * - 移除 HomeDraggableLayer 包装，直接用 <Card> 渲染在同一位置。
	 */

	const MUSIC_FILES = ['/music/Overdose.m4a']

	const styles = cardStyles.musicCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const calendarCardStyles = cardStyles.calendarCard
	// JSON 里偏移默认是 null，显式收窄类型方便做 !== null 判断
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	let audioEl = $state<HTMLAudioElement | null>(null)
	let isPlaying = $state(false)
	let currentIndex = $state(0)
	let progress = $state(0)

	const isHomePage = $derived(page.url.pathname === '/')

	const position = $derived.by(() => {
		// If not on home page, always position at bottom-right corner when playing
		if (!isHomePage) {
			return {
				x: center.width - styles.width - 16,
				y: center.height - styles.height - 16
			}
		}

		// Default position on home page
		return {
			x: offsetX !== null ? center.x + offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2 - styles.offset,
			y:
				offsetY !== null
					? center.y + offsetY
					: center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING
		}
	})

	function handleTimeUpdate() {
		const audio = audioEl
		if (audio?.duration) progress = (audio.currentTime / audio.duration) * 100
	}

	function handleEnded() {
		progress = 0
		isPlaying = false
		currentIndex = (currentIndex + 1) % MUSIC_FILES.length
	}

	function togglePlayPause() {
		const audio = audioEl
		if (!audio) return

		if (isPlaying) {
			audio.pause()
			isPlaying = false
			return
		}

		if (audio.ended) audio.currentTime = 0
		audio
			.play()
			.then(() => (isPlaying = true))
			.catch(() => (isPlaying = false))
	}
</script>

{#if isHomePage || isPlaying}
	<Card
		order={styles.order}
		width={styles.width}
		height={styles.height}
		x={position.x}
		y={position.y}
		class={cn('flex items-center gap-3', !isHomePage && 'fixed')}>
		{#if siteContent.enableChristmas}
			<img
				src="/images/christmas/snow-10.webp"
				alt="Christmas decoration"
				class="pointer-events-none absolute"
				style="width:120px;left:-8px;top:-12px;opacity:0.8" />
			<img
				src="/images/christmas/snow-11.webp"
				alt="Christmas decoration"
				class="pointer-events-none absolute"
				style="width:80px;right:-10px;top:-12px;opacity:0.8" />
		{/if}

		<span class="music-icon h-8 w-8">{@html MusicSVG}</span>

		<div class="flex-1">
			<div class="text-secondary text-sm">Overdose</div>

			<div class="mt-1 h-2 rounded-full bg-white/60">
				<div class="bg-linear h-full rounded-full transition-all duration-300" style="width:{progress}%"></div>
			</div>
		</div>

		<button
			type="button"
			onclick={togglePlayPause}
			aria-label={isPlaying ? '暂停' : '播放'}
			class="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80">
			{#if isPlaying}
				<Pause class="text-brand h-4 w-4" />
			{:else}
				<span class="play-icon ml-1 h-4 w-4">{@html PlaySVG}</span>
			{/if}
		</button>

		<audio
			bind:this={audioEl}
			src={MUSIC_FILES[currentIndex]}
			preload="metadata"
			ontimeupdate={handleTimeUpdate}
			onloadedmetadata={handleTimeUpdate}
			onended={handleEnded}></audio>
	</Card>
{/if}

<style>
	/* ?raw 注入的 svg 不自带尺寸，交给外层容器决定 */
	.music-icon :global(svg),
	.play-icon :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
