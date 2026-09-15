<script lang="ts">
	import { onMount } from 'svelte'
	import { siteContent } from '$lib/config/site'

	/**
	 * 背景模糊气泡（移植自旧站 src/layout/backgrounds/blurred-bubbles.tsx）
	 *
	 * - 气泡以近似蓝噪声的间距生成；
	 * - 运动 = Perlin/Simplex 流场 + 柔和分离力 + 低占用度吸引 + 底部条带约束；
	 * - canvas 相关逻辑全部放在 onMount（SSR 阶段不触碰 window / ResizeObserver）。
	 *
	 * 与旧站的差异：
	 * - props 只保留 colors / zIndex，旧文件其余默认参数改为本文件常量；
	 * - 移除 regenerateKey（P4 配置弹窗才需要）；
	 * - motion.div 的淡入改为 CSS 动画。
	 */

	let { colors = [], zIndex = 0 }: { colors?: string[]; zIndex?: number } = $props()

	/** 旧站 src/layout/backgrounds/utils.ts：内联的 2D Simplex 噪声（Jonas Wagner, public domain） */
	function makeNoise2D(random: () => number = Math.random) {
		const p = new Uint8Array(256)
		for (let i = 0; i < 256; i++) p[i] = (random() * 256) | 0
		function grad2(hash: number, x: number, y: number) {
			const h = hash & 7
			const u = h < 4 ? x : y
			const v = h < 4 ? y : x
			return (h & 1 ? -u : u) + (h & 2 ? -2 * v : 2 * v)
		}
		const G2 = (3.0 - Math.sqrt(3.0)) / 6.0
		const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
		return function noise2D(xin: number, yin: number) {
			let n0 = 0,
				n1 = 0,
				n2 = 0
			const s = (xin + yin) * F2
			const i = Math.floor(xin + s)
			const j = Math.floor(yin + s)
			const t = (i + j) * G2
			const X0 = i - t
			const Y0 = j - t
			const x0 = xin - X0
			const y0 = yin - Y0

			const i1 = x0 > y0 ? 1 : 0
			const j1 = x0 > y0 ? 0 : 1

			const x1 = x0 - i1 + G2
			const y1 = y0 - j1 + G2
			const x2 = x0 - 1 + 2 * G2
			const y2 = y0 - 1 + 2 * G2

			const ii = i & 255
			const jj = j & 255

			const t0 = 0.5 - x0 * x0 - y0 * y0
			if (t0 >= 0) {
				const gi0 = p[ii + p[jj]]
				const t0_4 = t0 * t0 * t0 * t0
				n0 = t0_4 * grad2(gi0, x0, y0)
			}

			const t1 = 0.5 - x1 * x1 - y1 * y1
			if (t1 >= 0) {
				const gi1 = p[ii + i1 + p[jj + j1]]
				const t1_4 = t1 * t1 * t1 * t1
				n1 = t1_4 * grad2(gi1, x1, y1)
			}

			const t2 = 0.5 - x2 * x2 - y2 * y2
			if (t2 >= 0) {
				const gi2 = p[ii + 1 + p[jj + 1]]
				const t2_4 = t2 * t2 * t2 * t2
				n2 = t2_4 * grad2(gi2, x2, y2)
			}

			return 40 * (n0 + n1 + n2)
		}
	}

	function rand(a: number, b: number) {
		return a + Math.random() * (b - a)
	}

	// 旧文件里的默认参数（props 现在只保留 colors / zIndex）
	const COUNT = 6
	const MIN_RADIUS = 250
	const MAX_RADIUS = 400
	const BOTTOM_BAND_START = 0.8
	const SPEED = 0.12
	const NOISE_SCALE = 0.0008
	const NOISE_TIME_SCALE = 0.00015
	const TARGET_FPS = 6
	const DEBUG_FPS = false
	const START_DELAY_MS = 1500

	let canvasEl = $state<HTMLCanvasElement | null>(null)

	onMount(() => {
		const canvas = canvasEl
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// colors 默认为空数组时回退到站点背景色，避免取到 undefined 颜色
		const palette = colors.length > 0 ? colors : siteContent.backgroundColors

		let width = (canvas.width = canvas.clientWidth)
		let height = (canvas.height = canvas.clientHeight)

		const DPR = Math.min(2, window.devicePixelRatio || 1)
		canvas.width = Math.floor(width * DPR)
		canvas.height = Math.floor(height * DPR)
		ctx.scale(DPR, DPR)

		const effectiveFps = Math.max(1, TARGET_FPS)
		const noise = makeNoise2D()

		let animId = 0
		let startTimer: ReturnType<typeof setTimeout> | null = null

		// 1s debounce for resize observer
		// 用 window.setTimeout（返回 number），与 clearTimeout 的用法保持一致
		let resizeTimer: number | null = null
		const handleResize = () => {
			const nextWidth = canvas.clientWidth
			const nextHeight = canvas.clientHeight
			if (nextWidth === width && nextHeight === height) return
			width = nextWidth
			height = nextHeight
			canvas.width = Math.floor(width * DPR)
			canvas.height = Math.floor(height * DPR)
			ctx.setTransform(1, 0, 0, 1, 0, 0)
			ctx.scale(DPR, DPR)
			// Recompute occupancy grid on resize
			allocateGrid()
			draw()
		}
		const onResize = () => {
			if (resizeTimer !== null) window.clearTimeout(resizeTimer)
			resizeTimer = window.setTimeout(() => {
				handleResize()
				resizeTimer = null
			}, 1000)
		}
		const ro = new ResizeObserver(onResize)
		ro.observe(canvas)

		// --- Occupancy grid (for coverage guidance) ---
		const gridCell = 80 // px
		let gridCols = 0
		let gridRows = 0
		let grid = new Float32Array(0)

		function allocateGrid() {
			gridCols = Math.max(1, Math.ceil(width / gridCell))
			gridRows = Math.max(1, Math.ceil(height / gridCell))
			grid = new Float32Array(gridCols * gridRows)
		}
		function stampOccupancy(x: number, y: number, r: number) {
			// Add a small amount to nearby cells so paths get balanced over time
			const c0 = Math.floor((x - r) / gridCell)
			const c1 = Math.floor((x + r) / gridCell)
			const r0 = Math.floor((y - r) / gridCell)
			const r1 = Math.floor((y + r) / gridCell)
			for (let cy = r0; cy <= r1; cy++) {
				for (let cx = c0; cx <= c1; cx++) {
					if (cx < 0 || cy < 0 || cx >= gridCols || cy >= gridRows) continue
					const idx = cy * gridCols + cx
					grid[idx] += 0.5 // weight
				}
			}
		}
		function lowestOccupancyTarget() {
			// Find the lowest occupancy cell inside the bottom band
			const startRow = Math.floor(gridRows * BOTTOM_BAND_START)
			let bestIdx = startRow * gridCols
			let bestVal = Infinity
			for (let cy = startRow; cy < gridRows; cy++) {
				for (let cx = 0; cx < gridCols; cx++) {
					const idx = cy * gridCols + cx
					const v = grid[idx]
					if (v < bestVal) {
						bestVal = v
						bestIdx = idx
					}
				}
			}
			const ty = (Math.floor(bestIdx / gridCols) + 0.5) * gridCell
			const tx = ((bestIdx % gridCols) + 0.5) * gridCell
			return { tx, ty }
		}
		allocateGrid()

		// Poisson-ish initial placement to avoid clusters
		const bubbles: { x: number; y: number; r: number; color: string; vx: number; vy: number; jitter: number; blur: number }[] = []
		const minDist = Math.max(MIN_RADIUS * 0.2, 80)
		const maxTries = 5000
		let tries = 0
		while (bubbles.length < COUNT && tries < maxTries) {
			tries++
			const r = rand(MIN_RADIUS, MAX_RADIUS)
			const x = rand(-r / 2, width + r / 2)
			const y = rand(height * BOTTOM_BAND_START, height * 1.2)
			let ok = true
			for (const b of bubbles) {
				const dx = b.x - x
				const dy = b.y - y
				if (Math.hypot(dx, dy) < (b.r + r) * 0.6 || Math.hypot(dx, dy) < minDist) {
					ok = false
					break
				}
			}
			if (ok) {
				bubbles.push({
					x,
					y,
					r,
					color: palette[bubbles.length % palette.length | 0] ?? palette[0],
					vx: rand(-0.2, 0.2),
					vy: rand(-0.2, 0.2),
					jitter: rand(0.6, 1.2),
					blur: rand(200, 400)
				})
			}
		}

		// --- Animation loop ---
		const FRAME_INTERVAL = 1000 / effectiveFps
		let lastTime = 0
		let accumulatedTime = 0
		let fpsCounter = 0
		let fpsStart = 0

		function updatePhysics(t: number) {
			const { tx, ty } = lowestOccupancyTarget()

			// Update physics
			for (let i = 0; i < bubbles.length; i++) {
				const b = bubbles[i]

				// 1) Flow field (smooth wandering)
				const n = noise(b.x * NOISE_SCALE, b.y * NOISE_SCALE + t * NOISE_TIME_SCALE)
				const angle = n * Math.PI * 2
				const fx = Math.cos(angle) * SPEED * b.jitter
				const fy = Math.sin(angle) * SPEED * b.jitter

				// 2) Separation (avoid clumping)
				let sx = 0
				let sy = 0
				for (let j = 0; j < bubbles.length; j++)
					if (j !== i) {
						const o = bubbles[j]
						const dx = b.x - o.x
						const dy = b.y - o.y
						const d2 = dx * dx + dy * dy
						const minD = (b.r + o.r) * 0.4
						if (d2 < minD * minD && d2 > 0.001) {
							const d = Math.sqrt(d2)
							const push = (minD - d) / minD // 0..1
							sx += (dx / d) * push * 0.8
							sy += (dy / d) * push * 0.8
						}
					}

				// 3) Coverage bias (drift toward emptier cells)
				const dxT = tx - b.x
				const dyT = ty - b.y
				const dT = Math.hypot(dxT, dyT) + 1e-3
				const cx = (dxT / dT) * 0.05 // gentle
				const cy = (dyT / dT) * 0.05

				// 4) Vertical band constraint
				const bandMin = height * BOTTOM_BAND_START
				const bandMax = height * 1.5
				let bx = 0
				let by = 0
				if (b.y < bandMin) by += (bandMin - b.y) * 0.01
				if (b.y > bandMax) by -= (b.y - bandMax) * 0.01

				// Combine forces
				b.vx += fx + sx + cx + bx
				b.vy += fy + sy + cy + by

				// Apply damping to prevent velocity accumulation
				const damping = 0.95
				b.vx *= damping
				b.vy *= damping

				// Velocity limits to prevent runaway motion
				const maxVel = 2
				const vel = Math.hypot(b.vx, b.vy)
				if (vel > maxVel) {
					b.vx = (b.vx / vel) * maxVel
					b.vy = (b.vy / vel) * maxVel
				}

				// Integrate
				b.x += b.vx
				b.y += b.vy

				// Soft wrap horizontally to avoid bunching at edges
				if (b.x < -b.r - b.blur / 3) b.x = width + b.r + b.blur / 3
				if (b.x > width + b.r + b.blur / 3) b.x = -b.r - b.blur / 3

				// Keep a little padding from exact edge vertically
				b.y = Math.min(Math.max(b.y, bandMin - b.r * 0.25), bandMax + b.r * 0.25)

				// Occupancy stamp
				stampOccupancy(b.x, b.y, b.r * 0.6)
			}
		}

		function draw() {
			// TS 在闭包里不会沿用外层对 ctx 的收窄，这里显式再判一次
			if (!ctx) return

			for (const b of bubbles) {
				ctx.save()
				ctx.filter = `blur(${b.blur}px)`
				ctx.globalAlpha = 0.8
				ctx.beginPath()
				ctx.fillStyle = b.color
				ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
				ctx.fill()
				ctx.restore()
			}
		}

		function frame(t: number) {
			// Rate limiting
			{
				if (document.hidden) {
					animId = requestAnimationFrame(frame)
					return
				}

				// Frame rate limiting
				const deltaTime = lastTime ? t - lastTime : 0
				lastTime = t
				accumulatedTime += deltaTime

				if (accumulatedTime < FRAME_INTERVAL) {
					animId = requestAnimationFrame(frame)
					return
				}

				accumulatedTime = 0
			}

			if (!ctx) return

			ctx.clearRect(0, 0, width, height)

			updatePhysics(t)

			draw()

			// FPS measurement (optional)
			if (DEBUG_FPS) {
				if (fpsStart === 0) fpsStart = t
				fpsCounter++
				if (t - fpsStart >= 1000) {
					// eslint-disable-next-line no-console
					console.log('[blurred-bubbles] fps=', fpsCounter, 'target=', effectiveFps)
					fpsCounter = 0
					fpsStart = t
				}
			}

			animId = requestAnimationFrame(frame)
		}

		// 旧站只在窄屏（<640px）延迟启动动画循环，这里原样保留
		if (window.innerWidth < 640) {
			startTimer = setTimeout(() => {
				animId = requestAnimationFrame(frame)
			}, START_DELAY_MS)
		}

		draw()

		return () => {
			cancelAnimationFrame(animId)
			ro.disconnect()
			if (resizeTimer !== null) window.clearTimeout(resizeTimer)
			if (startTimer !== null) clearTimeout(startTimer)
		}
	})
</script>

<div class="bubbles-fade fixed inset-0 overflow-hidden" style="z-index:{zIndex};filter:blur(50px)">
	<canvas bind:this={canvasEl} class="h-full w-full" style="display:block"></canvas>
</div>

<style>
	.bubbles-fade {
		animation: bubbles-fade-in 1s ease-out both;
	}

	@keyframes bubbles-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
