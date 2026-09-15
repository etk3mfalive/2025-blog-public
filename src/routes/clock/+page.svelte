<script lang="ts">
	/**
	 * 时钟 / 秒表 / 倒计时（移植自旧站 src/app/clock/page.tsx，381 行）
	 *
	 * 迁移要点：
	 * - React useState → Svelte 5 $state；useRef → 普通变量（rAF 循环内部状态，不需要响应式）
	 * - useEffect([isRunning, mode]) → $effect（同样的依赖：isRunning + mode）
	 * - motion.div/button 的出入场 → CSS keyframes（.pop-in）；whileHover/whileTap → Tailwind hover:scale/active:scale
	 * - 内联七段数码管 SevenSegmentDigit / Colon → 同文件 {#snippet}（不新增组件文件）
	 */
	import { untrack } from 'svelte'
	import { Play, Pause, RotateCcw } from 'lucide-svelte'
	import { cn } from '$lib/utils'

	type TimerMode = 'stopwatch' | 'timer'

	let mode = $state<TimerMode>('stopwatch')
	let stopwatchTime = $state(0)
	let timerTime = $state(0)
	let timerInput = $state({ hours: 0, minutes: 0, seconds: 0 })
	let isRunning = $state(false)
	let laps = $state<number[]>([])

	// 旧实现里的 useRef：只给 rAF 循环用，不能是响应式的（否则每帧都会重建循环）
	let rafId: number | null = null
	let startTime: number | null = null
	let pausedTime = 0
	let initialTimerTime = 0

	// 等价于旧站的 useEffect(() => {...}, [isRunning, mode])
	// 循环内部读 stopwatchTime / timerTime 时用 untrack，避免"写自己 → 重跑 effect"的死循环
	$effect(() => {
		const active = isRunning
		const currentMode = mode

		if (active) {
			const now = performance.now()
			if (startTime === null) {
				// 全新开始
				startTime = now
				if (currentMode === 'timer') {
					initialTimerTime = untrack(() => timerTime)
				}
			} else if (currentMode === 'stopwatch') {
				// 从暂停恢复
				startTime = now - pausedTime
			} else {
				startTime = now - (initialTimerTime - untrack(() => timerTime))
			}

			const updateTime = () => {
				const current = performance.now()
				const elapsed = current - (startTime as number)

				if (currentMode === 'stopwatch') {
					stopwatchTime = Math.floor(elapsed)
				} else {
					const remaining = initialTimerTime - elapsed
					if (remaining <= 0) {
						timerTime = 0
						isRunning = false
						startTime = null
						return
					}
					timerTime = Math.floor(remaining)
				}

				rafId = requestAnimationFrame(updateTime)
			}

			rafId = requestAnimationFrame(updateTime)
		} else {
			if (rafId !== null) {
				cancelAnimationFrame(rafId)
				rafId = null
			}
			if (startTime !== null && currentMode === 'stopwatch') {
				pausedTime = untrack(() => stopwatchTime)
			}
		}

		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId)
				rafId = null
			}
		}
	})

	function handleStartPause() {
		if (mode === 'timer' && timerTime === 0) {
			const totalMs = timerInput.hours * 3600000 + timerInput.minutes * 60000 + timerInput.seconds * 1000
			if (totalMs <= 0) return
			timerTime = totalMs
			initialTimerTime = totalMs
		}
		if (!isRunning) {
			startTime = null
		}
		isRunning = !isRunning
	}

	function handleReset() {
		isRunning = false
		startTime = null
		pausedTime = 0
		initialTimerTime = 0
		if (mode === 'stopwatch') {
			stopwatchTime = 0
			laps = []
		} else {
			timerTime = 0
			timerInput = { hours: 0, minutes: 0, seconds: 0 }
		}
	}

	function handleLap() {
		if (mode === 'stopwatch' && isRunning) {
			laps = [stopwatchTime, ...laps]
		}
	}

	function switchTo(next: TimerMode) {
		mode = next
		isRunning = false
		startTime = null
		pausedTime = 0
		initialTimerTime = 0
		if (next === 'stopwatch') {
			timerTime = 0
			timerInput = { hours: 0, minutes: 0, seconds: 0 }
		} else {
			stopwatchTime = 0
			laps = []
		}
	}

	function setTimerField(field: 'hours' | 'minutes' | 'seconds', raw: string, max: number) {
		const value = Math.max(0, Math.min(max, parseInt(raw) || 0))
		timerInput = { ...timerInput, [field]: value }
	}

	function formatTime(ms: number) {
		const totalSeconds = Math.floor(ms / 1000)
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		const milliseconds = Math.floor((ms % 1000) / 10)

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
				.toString()
				.padStart(2, '0')}`
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
	}

	const displayTime = $derived(mode === 'stopwatch' ? stopwatchTime : timerTime)
	const canStart = $derived(
		mode === 'timer' ? timerTime > 0 || timerInput.hours > 0 || timerInput.minutes > 0 || timerInput.seconds > 0 : true
	)

	// 旧实现的 segmentMap 原样搬过来（0-9，七段：上/右上/右下/下/左下/左上/中）
	const segmentMap: Record<number, boolean[]> = {
		0: [true, true, true, true, true, true, false],
		1: [false, true, true, false, false, false, false],
		2: [true, true, false, true, true, false, true],
		3: [true, true, true, true, false, false, true],
		4: [false, true, true, false, false, true, true],
		5: [true, false, true, true, false, true, true],
		6: [true, false, true, true, true, true, true],
		7: [true, true, true, false, false, false, false],
		8: [true, true, true, true, true, true, true],
		9: [true, true, true, true, false, true, true]
	}
	const activeColor = 'var(--color-primary)'
	const inactiveColor = 'rgba(0, 0, 0, 0.05)'
</script>

<svelte:head>
	<title>时钟 | SelfWeb</title>
	<meta name="description" content="秒表与倒计时，七段数码管显示。" />
</svelte:head>

<!-- 七段数码管（等价旧站 SevenSegmentDigit，SVG path 完全沿用） -->
{#snippet sevenSegment(value: number)}
	{@const segments = segmentMap[value] ?? segmentMap[0]}
	<svg width="29" height="52" viewBox="0 0 29 52" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M4.20248 3.49482C2.82797 2.27303 3.69218 0 5.53121 0H22.6867C24.5522 0 25.4019 2.32821 23.975 3.52982L23.5791 3.86316C23.2186 4.16681 22.7623 4.33333 22.2909 4.33333H5.90621C5.41638 4.33333 4.94359 4.15358 4.57748 3.82815L4.20248 3.49482Z"
			fill={segments[0] ? activeColor : inactiveColor}
		/>
		<path
			d="M3.85122 24.13C4.16644 23.936 4.5293 23.8333 4.89942 23.8333H23.3022C23.6503 23.8333 23.9923 23.9242 24.2945 24.0969L24.5862 24.2635C25.9298 25.0313 25.9298 26.9687 24.5862 27.7365L24.2945 27.9032C23.9923 28.0758 23.6503 28.1667 23.3022 28.1667H4.89942C4.5293 28.1667 4.16644 28.064 3.85122 27.87L3.58039 27.7033C2.31131 26.9224 2.31132 25.0777 3.58039 24.2967L3.85122 24.13Z"
			fill={segments[6] ? activeColor : inactiveColor}
		/>
		<path
			d="M3.06 23.5458C1.7279 24.3784 -8.31295e-08 23.4207 -1.47217e-07 21.8498L-8.06095e-07 5.69981C-8.77526e-07 3.94893 2.09055 3.04323 3.36788 4.24073L3.70121 4.55323C4.10452 4.93133 4.33333 5.45949 4.33333 6.01231L4.33333 21.6415C4.33333 22.3311 3.97809 22.972 3.39333 23.3375L3.06 23.5458Z"
			fill={segments[5] ? activeColor : inactiveColor}
		/>
		<path
			d="M24.8497 4.25654C26.1428 3.12502 28.1667 4.04338 28.1667 5.76169L28.1667 21.8498C28.1667 23.4207 26.4388 24.3784 25.1067 23.5458L24.7734 23.3375C24.1886 22.972 23.8334 22.3311 23.8334 21.6415L23.8334 6.05336C23.8334 5.47663 24.0823 4.92798 24.5163 4.54821L24.8497 4.25654Z"
			fill={segments[1] ? activeColor : inactiveColor}
		/>
		<path
			d="M23.9259 48.6321C25.1234 49.9094 24.2177 52 22.4669 52L5.69978 52C3.9489 52 3.04321 49.9094 4.24071 48.6321L4.55321 48.2988C4.9313 47.8955 5.45947 47.6667 6.01228 47.6667L22.1544 47.6667C22.7072 47.6667 23.2353 47.8955 23.6134 48.2988L23.9259 48.6321Z"
			fill={segments[3] ? activeColor : inactiveColor}
		/>
		<path
			d="M25.1862 28.489C26.5194 27.7391 28.1667 28.7025 28.1667 30.2322L28.1667 46.6299C28.1667 48.4117 26.0124 49.3041 24.7525 48.0441L24.4191 47.7108C24.0441 47.3357 23.8334 46.827 23.8334 46.2966L23.8334 30.4197C23.8334 29.6971 24.2231 29.0308 24.8528 28.6765L25.1862 28.489Z"
			fill={segments[2] ? activeColor : inactiveColor}
		/>
		<path
			d="M3.4564 47.7859C2.21509 49.1048 4.23823e-07 48.2263 6.6133e-07 46.4152L2.79423e-06 30.1501C3.00022e-06 28.5793 1.72791 27.6216 3.06 28.4541L3.39333 28.6625C3.9781 29.028 4.33334 29.6689 4.33334 30.3585L4.33333 46.061C4.33333 46.5705 4.13891 47.0607 3.78973 47.4317L3.4564 47.7859Z"
			fill={segments[4] ? activeColor : inactiveColor}
		/>
	</svg>
{/snippet}

{#snippet colon()}
	<div class="flex flex-col justify-center gap-2">
		<div class="bg-primary h-1.5 w-1.5"></div>
		<div class="bg-primary h-1.5 w-1.5"></div>
	</div>
{/snippet}

<!-- 等价旧站 TimeDisplay -->
{#snippet timeDisplay(time: number)}
	{@const totalSeconds = Math.floor(time / 1000)}
	{@const hours = Math.floor(totalSeconds / 3600)}
	{@const minutes = Math.floor((totalSeconds % 3600) / 60)}
	{@const seconds = totalSeconds % 60}
	{@const milliseconds = Math.floor((time % 1000) / 10)}
	{@const hoursStr = hours.toString().padStart(2, '0')}
	{@const minutesStr = minutes.toString().padStart(2, '0')}
	{@const secondsStr = seconds.toString().padStart(2, '0')}
	{@const millisecondsStr = milliseconds.toString().padStart(2, '0')}
	<div class="flex items-center justify-center gap-1.5">
		{#if hours > 0}
			{@render sevenSegment(parseInt(hoursStr[0]))}
			{@render sevenSegment(parseInt(hoursStr[1]))}
			{@render colon()}
		{/if}
		{@render sevenSegment(parseInt(minutesStr[0]))}
		{@render sevenSegment(parseInt(minutesStr[1]))}
		{@render colon()}
		{@render sevenSegment(parseInt(secondsStr[0]))}
		{@render sevenSegment(parseInt(secondsStr[1]))}
		{@render colon()}
		{@render sevenSegment(parseInt(millisecondsStr[0]))}
		{@render sevenSegment(parseInt(millisecondsStr[1]))}
	</div>
{/snippet}

<div class="flex flex-col items-center px-6 pt-32 pb-12">
	<div class="pop-in w-full max-w-[600px] space-y-8" style="--pop-from: 0.9">
		<!-- 模式选择 -->
		<div class="card relative flex gap-4 rounded-xl p-2">
			<button
				onclick={() => switchTo('stopwatch')}
				class={cn(
					'flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]',
					mode === 'stopwatch' ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand'
				)}>
				秒表
			</button>
			<button
				onclick={() => switchTo('timer')}
				class={cn(
					'flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]',
					mode === 'timer' ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand'
				)}>
				计时器
			</button>
		</div>

		<div class="pop-in card relative p-4" style="--pop-from: 0.95">
			<div class="bg-secondary/20 flex items-center justify-center rounded-4xl p-8">
				{#key mode}
					{@render timeDisplay(displayTime)}
				{/key}
			</div>
		</div>

		<!-- 倒计时输入（仅计时器模式、未运行、未开始时） -->
		{#if mode === 'timer' && !isRunning && timerTime === 0}
			<div class="pop-in card relative space-y-4" style="--pop-from: 0.8">
				<div class="flex items-center justify-center gap-4">
					<div class="flex flex-col items-center gap-2">
						<label class="text-secondary text-xs" for="timer-hours">时</label>
						<input
							id="timer-hours"
							type="number"
							min="0"
							max="23"
							value={timerInput.hours}
							oninput={e => setTimerField('hours', e.currentTarget.value, 23)}
							class="no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80"
						/>
					</div>
					<div class="text-secondary mt-8 text-2xl font-bold">:</div>
					<div class="flex flex-col items-center gap-2">
						<label class="text-secondary text-xs" for="timer-minutes">分</label>
						<input
							id="timer-minutes"
							type="number"
							min="0"
							max="59"
							value={timerInput.minutes}
							oninput={e => setTimerField('minutes', e.currentTarget.value, 59)}
							class="no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80"
						/>
					</div>
					<div class="text-secondary mt-8 text-2xl font-bold">:</div>
					<div class="flex flex-col items-center gap-2">
						<label class="text-secondary text-xs" for="timer-seconds">秒</label>
						<input
							id="timer-seconds"
							type="number"
							min="0"
							max="59"
							value={timerInput.seconds}
							oninput={e => setTimerField('seconds', e.currentTarget.value, 59)}
							class="no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80"
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- 控制按钮 -->
		<div class="flex items-center justify-center gap-4">
			{#if mode === 'stopwatch'}
				<button
					onclick={handleLap}
					disabled={!isRunning}
					class="flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 text-sm font-medium backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
					计次
				</button>
			{/if}
			<button
				onclick={handleStartPause}
				disabled={!canStart}
				class={cn(
					'flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
					isRunning ? 'bg-brand-secondary hover:bg-brand-secondary/80' : 'bg-brand hover:bg-brand/80'
				)}>
				{#if isRunning}
					<Pause class="h-8 w-8" />
				{:else}
					<Play class="h-8 w-8" />
				{/if}
			</button>
			<button
				onclick={handleReset}
				disabled={isRunning && mode === 'stopwatch'}
				class="flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
				<RotateCcw class="h-5 w-5" />
			</button>
		</div>

		{#if mode === 'stopwatch' && laps.length > 0}
			<div class="grid grid-cols-3 gap-3">
				{#each laps as lap, index (index)}
					<div class="pop-in bg-card flex items-center justify-center rounded-2xl px-6 py-4" style="--pop-from: 0.6">
						<span class="font-mono text-sm font-medium">
							<span class="text-secondary">{laps.length - index}.</span> {formatTime(lap)}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* 旧站 motion.div 的 initial/animate（opacity + scale）用 CSS keyframes 还原 */
	@keyframes pop-in-frame {
		from {
			opacity: 0;
			transform: scale(var(--pop-from, 0.9));
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.pop-in {
		animation: pop-in-frame 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
</style>
