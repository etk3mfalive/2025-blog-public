<script lang="ts">
	/**
	 * Live2D 查看器（合并旧站 src/app/live2d/page.tsx（11 行）+ live2d-viewer.tsx（123 行））
	 *
	 * 迁移要点：
	 * - 旧实现运行时注入三个 CDN 脚本（pixi.js / live2dcubismcore / pixi-live2d-display），
	 *   这里在 onMount 里用 document.createElement('script') 顺序加载，失败走友好错误分支
	 * - window / document / 动态 canvas 全部只在 onMount（浏览器）中触碰，SSR 预渲染时只输出占位
	 * - 清理：app.destroy({ removeView: true }) + 移除 canvas + 清空容器；销毁后不再 setState
	 * - motion / lucide 均未使用，无 toast（旧文件也没有）
	 */
	import { onMount } from 'svelte'

	/** PIXI Application 实例（CDN 加载，无类型包） */
	interface PixiAppInstance {
		stage: { addChild: (child: unknown) => void }
		view: HTMLCanvasElement
		destroy: (opts?: { removeView?: boolean }) => void
	}

	/** Live2D 模型实例 */
	interface Live2DModelInstance {
		anchor: { set: (x: number, y: number) => void }
		x: number
		y: number
		scale: { set: (x: number, y: number) => void }
	}

	interface PixiGlobal {
		Application: new (opts: { view: HTMLCanvasElement; width?: number; height?: number; backgroundAlpha?: number }) => PixiAppInstance
		live2d?: { Live2DModel: { from: (url: string) => Promise<Live2DModelInstance> } }
	}

	const CDN_SCRIPTS = [
		'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.2.0/browser/pixi.min.js',
		'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
		'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'
	]

	const MODEL_URL = '/live2d/live2d.model3.json'

	function loadScript(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${src}"]`)) {
				resolve()
				return
			}
			const script = document.createElement('script')
			script.src = src
			script.crossOrigin = 'anonymous'
			script.onload = () => resolve()
			script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
			document.head.appendChild(script)
		})
	}

	let container = $state<HTMLDivElement | null>(null)
	let status = $state<'loading' | 'ready' | 'error'>('loading')
	let errorMsg = $state('')

	onMount(() => {
		const el = container
		if (!el) return

		let app: PixiAppInstance | null = null
		let canvas: HTMLCanvasElement | null = null
		let disposed = false

		const init = async () => {
			try {
				for (const src of CDN_SCRIPTS) {
					await loadScript(src)
				}

				const PIXI = (window as unknown as { PIXI?: PixiGlobal }).PIXI
				if (!PIXI) {
					throw new Error('PIXI not found on window')
				}

				const PIXIApp = PIXI.Application
				const Live2DModel = PIXI.live2d?.Live2DModel

				if (!Live2DModel) {
					throw new Error('PIXI.live2d.Live2DModel not found')
				}

				const width = el.clientWidth || 500
				const height = el.clientHeight || 500
				canvas = document.createElement('canvas')
				canvas.style.width = '100%'
				canvas.style.height = '100%'
				canvas.style.display = 'block'
				el.appendChild(canvas)

				const instance = new PIXIApp({
					view: canvas,
					width,
					height,
					backgroundAlpha: 0
				})
				app = instance

				const model = await Live2DModel.from(MODEL_URL)
				if (disposed) return
				instance.stage.addChild(model)

				model.anchor.set(0.5, 0.5)
				model.x = width / 2
				model.y = height / 2
				model.scale.set(0.25, 0.25)

				status = 'ready'
			} catch (err) {
				if (disposed) return
				errorMsg = err instanceof Error ? err.message : String(err)
				status = 'error'
			}
		}

		init()

		return () => {
			disposed = true
			if (app !== null && typeof app === 'object' && 'destroy' in app && typeof app.destroy === 'function') {
				app.destroy({ removeView: true })
			}
			canvas?.remove()
			canvas = null
			el.innerHTML = ''
		}
	})
</script>

<svelte:head>
	<title>Live2D | SelfWeb</title>
	<meta name="description" content="在浏览器里查看 Live2D 模型。" />
</svelte:head>

<div class="flex h-full items-center justify-center py-8">
	<div class="relative aspect-square w-full overflow-hidden rounded-full">
		<div bind:this={container} class="absolute inset-0 h-full w-full"></div>
		{#if status === 'loading'}
			<div class="text-secondary absolute inset-0 flex items-center justify-center">加载 Live2D 模型中…</div>
		{/if}
		{#if status === 'error'}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
				<p class="text-red-500">Live2D 模型加载失败，请检查网络连接后刷新页面重试。</p>
				{#if errorMsg}
					<p class="text-secondary text-xs break-all">{errorMsg}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
