<script lang="ts">
	/**
	 * PNG / JPG → WEBP 图片工具箱（移植自旧站 src/app/image-toolbox/page.tsx，476 行）
	 *
	 * 迁移要点：
	 * - 全部转换逻辑留在浏览器（createImageBitmap + canvas.toBlob('image/webp')），不上传任何文件
	 * - useState/useMemo/useCallback/useRef → $state（数组用 $state.raw，因为总是整体替换）/ $derived / 普通函数
	 * - motion/react → CSS keyframes（.pop-in）+ animation-delay（沿用旧站 INIT_DELAY / ANIMATION_DELAY）
	 * - 旧站 DialogModal 组件 → 本文件内联的遮罩层（含 Esc 关闭、锁定 body 滚动，均在 $effect 中做，SSR 安全）
	 * - alert(...) → 页面内文字状态（本项目无 toast 库），文案保持原样
	 * - 旧站 globals.css 的 .range-track 滑块样式已提到 app.css（全局复用）
	 */
	import { onMount } from 'svelte'
	import { ANIMATION_DELAY, INIT_DELAY } from '$lib/utils'

	type ConvertedMeta = {
		url: string
		size: number
	}

	type SelectedImage = {
		file: File
		preview: string
		width: number
		height: number
		converted?: ConvertedMeta
		converting?: boolean
	}

	const MAX_NAME_LENGTH = 32

	function getFileExtension(name: string) {
		const idx = name.lastIndexOf('.')
		return idx >= 0 ? name.slice(idx) : ''
	}

	function formatFileName(name: string) {
		if (name.length <= MAX_NAME_LENGTH) return name
		const ext = getFileExtension(name)
		if (!ext) {
			return `${name.slice(0, MAX_NAME_LENGTH - 3)}...`
		}
		const maxBaseLength = Math.max(1, MAX_NAME_LENGTH - ext.length - 3)
		return `${name.slice(0, maxBaseLength)}...${ext}`
	}

	function formatBytes(bytes: number) {
		if (bytes < 1024) return `${bytes.toFixed(0)} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`
	}

	async function fileToWebp(file: File, quality: number, maxWidth?: number) {
		const bitmap = await createImageBitmap(file)
		const canvas = document.createElement('canvas')

		let width = bitmap.width
		let height = bitmap.height

		if (maxWidth && width > maxWidth) {
			const ratio = maxWidth / width
			width = maxWidth
			height = Math.round(height * ratio)
		}

		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')
		if (!ctx) throw new Error('无法初始化画布')
		ctx.drawImage(bitmap, 0, 0, width, height)
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				result => {
					if (result) resolve(result)
					else reject(new Error('无法生成 WEBP 文件'))
				},
				'image/webp',
				quality
			)
		})
		return blob
	}

	// 数组元素包含 File / objectURL，始终整体替换 → 用 $state.raw，避免深层 proxy
	let images = $state.raw<SelectedImage[]>([])
	let quality = $state(0.8)
	let limitMaxWidth = $state(false)
	let maxWidth = $state(1200)
	let batchConverting = $state(false)
	let compareIndex = $state<number | null>(null)
	let isDragging = $state(false)
	// 旧站用 alert() 报错，这里改成页面内提示
	let errorMsg = $state<string | null>(null)

	let dragCounter = 0

	const hasImages = $derived(images.length > 0)
	const hasConvertible = $derived(images.length > 0)
	const hasConverted = $derived(images.some(item => !!item.converted))
	const totalSize = $derived.by(() => {
		const bytes = images.reduce((acc, item) => acc + item.file.size, 0)
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`
	})
	const compareItem = $derived(compareIndex !== null ? (images[compareIndex] ?? null) : null)

	// 旧站 DialogModal：打开时锁 body 滚动 + Esc 关闭（浏览器 API，只能放在 $effect）
	$effect(() => {
		if (!compareItem) return
		const previous = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeCompare()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => {
			document.body.style.overflow = previous
			window.removeEventListener('keydown', onKeyDown)
		}
	})

	onMount(() => {
		return () => {
			// 组件销毁时回收所有 objectURL
			for (const item of images) {
				URL.revokeObjectURL(item.preview)
				if (item.converted?.url) URL.revokeObjectURL(item.converted.url)
			}
		}
	})

	async function handleFiles(fileList: FileList | null) {
		if (!fileList?.length) return
		const files = Array.from(fileList).filter(file => file.type.startsWith('image/'))
		if (!files.length) return

		const nextItems = await Promise.all(
			files.map(async file => {
				const preview = URL.createObjectURL(file)
				const bitmap = await createImageBitmap(file)
				return {
					file,
					preview,
					width: bitmap.width,
					height: bitmap.height
				}
			})
		)

		const deduped = [...images]
		nextItems.forEach(item => {
			const exists = deduped.some(existing => {
				return existing.file.name === item.file.name && existing.file.size === item.file.size && existing.file.lastModified === item.file.lastModified
			})

			if (!exists) {
				deduped.push(item)
			} else {
				URL.revokeObjectURL(item.preview)
			}
		})
		images = deduped
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault()
		event.stopPropagation()
		dragCounter += 1
		isDragging = true
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		event.stopPropagation()
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		event.stopPropagation()
		dragCounter = Math.max(0, dragCounter - 1)
		if (dragCounter === 0) {
			isDragging = false
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault()
		event.stopPropagation()
		isDragging = false
		dragCounter = 0
		handleFiles(event.dataTransfer?.files ?? null)
	}

	async function handleConvertImage(index: number) {
		const target = images[index]
		if (!target || target.converting) return
		errorMsg = null
		images = images.map((item, idx) => (idx === index ? { ...item, converting: true } : item))
		try {
			const blob = await fileToWebp(target.file, quality, limitMaxWidth ? maxWidth : undefined)
			const url = URL.createObjectURL(blob)
			images = images.map((item, idx) => {
				if (idx !== index) return item
				if (item.converted?.url) {
					URL.revokeObjectURL(item.converted.url)
				}
				return {
					...item,
					converting: false,
					converted: {
						url,
						size: blob.size
					}
				}
			})
		} catch (error) {
			console.error(error)
			errorMsg = '转换过程中出现问题，请稍后再试'
			images = images.map((item, idx) => (idx === index ? { ...item, converting: false } : item))
		}
	}

	function handleDownloadImage(index: number) {
		const target = images[index]
		if (!target?.converted) return
		const link = document.createElement('a')
		const baseName = target.file.name.replace(/\.[^.]+$/, '')
		link.href = target.converted.url
		link.download = `${baseName}.webp`
		document.body.appendChild(link)
		link.click()
		link.remove()
	}

	async function handleConvertAll() {
		if (!hasImages || batchConverting) return
		errorMsg = null
		batchConverting = true
		try {
			const list = [...images]
			for (let i = 0; i < list.length; i += 1) {
				const current = list[i]
				if (!current) continue
				images = images.map((item, idx) => (idx === i ? { ...item, converting: true } : item))
				const blob = await fileToWebp(current.file, quality, limitMaxWidth ? maxWidth : undefined)
				const url = URL.createObjectURL(blob)
				images = images.map((item, idx) => {
					if (idx !== i) return item
					if (item.converted?.url) {
						URL.revokeObjectURL(item.converted.url)
					}
					return {
						...item,
						converting: false,
						converted: {
							url,
							size: blob.size
						}
					}
				})
			}
		} catch (error) {
			console.error(error)
			errorMsg = '批量转换过程中出现问题，请稍后再试'
		} finally {
			batchConverting = false
		}
	}

	function handleDownloadAll() {
		if (!hasConverted) return
		images.forEach(item => {
			if (!item.converted) return
			const link = document.createElement('a')
			const baseName = item.file.name.replace(/\.[^.]+$/, '')
			link.href = item.converted.url
			link.download = `${baseName}.webp`
			document.body.appendChild(link)
			link.click()
			link.remove()
		})
	}

	function closeCompare() {
		compareIndex = null
	}

	function handleRemoveImage(index: number) {
		const next = [...images]
		const removed = next.splice(index, 1)[0]
		if (removed) {
			URL.revokeObjectURL(removed.preview)
			if (removed.converted?.url) {
				URL.revokeObjectURL(removed.converted.url)
			}
		}
		images = next
		if (compareIndex !== null && compareIndex >= images.length) {
			compareIndex = null
		}
	}
</script>

<svelte:head>
	<title>图片工具 | SelfWeb</title>
	<meta name="description" content="在浏览器内把 PNG / JPG 批量转换为 WEBP，可调质量与最大宽度，不上传文件。" />
</svelte:head>

<div class="relative px-6 pt-32 pb-12 text-sm max-sm:pt-28">
	<div class="mx-auto flex max-w-3xl flex-col gap-6">
		<div class="pop-in space-y-2 text-center" style="--pop-from: 0.9; animation-delay: {INIT_DELAY}s">
			<p class="text-secondary text-xs tracking-[0.2em] uppercase">Image Toolbox</p>
			<h1 class="text-2xl font-semibold">PNG / JPG 转 WEBP</h1>
			<p class="text-secondary">选择图片 → 调整质量 → 一键转换下载</p>
		</div>

		<label
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			class="group hover:border-brand/20 card relative flex cursor-pointer flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-white/80 {isDragging
				? 'border-brand bg-white'
				: ''}">
			<input type="file" accept="image/*" multiple class="hidden" onchange={e => handleFiles(e.currentTarget.files)} />
			<div class="bg-brand/10 text-brand/60 group-hover:bg-brand/10 flex h-20 w-20 items-center justify-center rounded-full text-3xl transition">
				📷
			</div>
			<div>
				<p class="text-base font-medium">点击或拖拽图片</p>
				<p class="text-secondary text-xs">支持 PNG、JPG、JPEG、HEIC 等常见格式</p>
			</div>
		</label>

		{#if hasImages}
			<div class="pop-in card relative" style="--pop-from: 0.9">
				<div class="text-secondary flex items-center justify-between border-b border-slate-200 pb-3 text-xs tracking-[0.2em] uppercase">
					<span>已选择 {images.length} 张图片</span>
					<span>{totalSize}</span>
				</div>
				<ul class="divide-y divide-slate-200">
					{#each images as item, index (item.file.name + '-' + index)}
						<li class="flex items-center gap-4 py-3">
							<div class="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
								<img src={item.preview} alt={item.file.name} class="h-full w-full object-cover" />
							</div>
							<div class="flex flex-1 flex-col">
								<p class="font-medium">{formatFileName(item.file.name)}</p>
								<p class="text-secondary text-xs">
									{item.width} × {item.height} · {formatBytes(item.file.size)}{item.converted
										? `（转换后 ${formatBytes(item.converted.size)}）`
										: ''}
								</p>
							</div>
							<div class="flex flex-wrap justify-end gap-2 text-xs">
								<button
									onclick={() => handleConvertImage(index)}
									disabled={!!item.converting}
									class="rounded-full px-3 py-1 font-medium transition disabled:cursor-not-allowed disabled:text-slate-300">
									{item.converting ? '转换中...' : item.converted ? '重新转换' : '转换'}
								</button>
								{#if item.converted}
									<button
										onclick={() => (compareIndex = index)}
										class="border-brand text-brand hover:bg-brand/10 rounded-full border px-3 py-1 font-semibold transition">
										对比
									</button>
									<button
										onclick={() => handleDownloadImage(index)}
										class="border-brand text-brand hover:bg-brand/10 rounded-full border px-3 py-1 font-semibold transition">
										下载
									</button>
								{/if}
								<button
									onclick={() => handleRemoveImage(index)}
									class="rounded-full border border-red-200 px-3 py-1 font-medium text-rose-400 transition hover:bg-rose-50">
									移除
								</button>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="pop-in card relative" style="--pop-from: 0.9; animation-delay: {INIT_DELAY + 2 * ANIMATION_DELAY}s">
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex-1 space-y-4">
					<div>
						<p class="text-secondary text-xs tracking-[0.2em] uppercase">质量</p>
						<div class="flex items-center gap-3 pt-2">
							<input
								type="range"
								min="0.3"
								max="1"
								step="0.05"
								value={quality}
								oninput={e => (quality = parseFloat(e.currentTarget.value))}
								class="range-track"
							/>
							<span class="w-12 text-right text-sm font-medium">{Math.round(quality * 100)}%</span>
						</div>
						<p class="text-xs text-slate-500">使用 canvas.toDataURL('image/webp', {quality.toFixed(2)})</p>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="limit-max-width"
								checked={limitMaxWidth}
								onchange={e => (limitMaxWidth = e.currentTarget.checked)}
								class="h-4 w-4 rounded border-slate-300"
							/>
							<label for="limit-max-width" class="text-secondary cursor-pointer text-xs tracking-[0.2em] uppercase">限制最大宽度</label>
						</div>
						{#if limitMaxWidth}
							<div class="flex items-center gap-2">
								<input
									type="number"
									min="100"
									max="10000"
									step="100"
									value={maxWidth}
									oninput={e => (maxWidth = Math.max(100, parseInt(e.currentTarget.value) || 1200))}
									class="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
								/>
								<span class="text-xs text-slate-500">px</span>
							</div>
						{/if}
					</div>
				</div>
				<div class="flex flex-wrap gap-2 text-sm">
					<button
						onclick={handleConvertAll}
						disabled={!hasConvertible || batchConverting}
						class="rounded-full border border-slate-200 px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300">
						{batchConverting ? '全部转换中…' : '全部转换'}
					</button>
					<button
						onclick={handleDownloadAll}
						disabled={!hasConverted}
						class="border-brand text-brand rounded-full border px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300">
						全部下载
					</button>
				</div>
			</div>
			{#if errorMsg}
				<p class="mt-4 text-sm text-rose-500" role="alert">{errorMsg}</p>
			{/if}
		</div>
	</div>

	{#if compareItem && compareItem.converted}
		<div
			class="bg-card fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
			role="presentation"
			onclick={closeCompare}
			onkeydown={event => {
				if (event.key === 'Escape') closeCompare()
			}}>
			<div class="grid w-full grid-cols-2 gap-4">
				<div class="flex flex-col items-end p-4">
					<div>
						<div class="text-secondary text-center text-sm font-medium">原图 ({formatBytes(compareItem.file.size)})</div>
						<img src={compareItem.preview} alt="Original" class="mt-3 max-h-[90vh] rounded-xl bg-slate-100" />
					</div>
				</div>
				<div class="flex flex-col items-start p-4">
					<div>
						<div class="text-secondary text-center text-sm font-medium">WEBP ({formatBytes(compareItem.converted.size)})</div>
						<img src={compareItem.converted.url} alt="Converted" class="mt-3 max-h-[90vh] rounded-xl bg-slate-100" />
					</div>
				</div>
			</div>
		</div>
	{/if}
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
