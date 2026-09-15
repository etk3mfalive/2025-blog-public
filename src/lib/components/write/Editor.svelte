<script lang="ts">
	/**
	 * 共用编辑器（新建 / 编辑两个页面复用）
	 *
	 * 与旧站 store 版的差别：
	 * - 旧站用全局 zustand store 承载表单，这里把表单状态留给页面，组件只做 UI + 光标插入，
	 *   两个页面各自调用 publishBlog，编辑器保持"受控组件"语义。
	 * - 图片沿用旧站的 `(local-image:<id>)` 占位符约定：id 由本地维护（crypto.randomUUID()），
	 *   发布时 publishBlog 负责替换成真实路径；这里只负责把占位符插到光标处。
	 */
	import { onDestroy } from 'svelte'
	import type { Snippet } from 'svelte'
	import { cn } from '$lib/utils'
	import type { ImageItem } from '$lib/github/blog'

	export type EditorFormValues = {
		slug: string
		title: string
		md: string
		tags: string[]
		date: string
		summary: string
		hidden: boolean
		category: string
	}

	export type LocalImage = { id: string; item: ImageItem }

	type Props = {
		mode: 'create' | 'edit'
		form: EditorFormValues
		images: LocalImage[]
		/** 当前封面对应的本地图片 id（URL 封面为 null） */
		coverId?: string | null
		coverUrl?: string
		categories?: string[]
		disabled?: boolean
		onFieldChange: <K extends keyof EditorFormValues>(key: K, value: EditorFormValues[K]) => void
		onAddImages: (images: LocalImage[], source: 'file' | 'paste') => void
		onRemoveImage: (id: string) => void
		onDeleteImage: (id: string) => void
		onSetCover: (id: string | null) => void
		/** 父页面通过 {#snippet preview()} 传入预览区（留空则不渲染） */
		preview?: Snippet
	}

	let {
		mode,
		form,
		images,
		coverId = null,
		coverUrl = '',
		categories = [],
		disabled = false,
		onFieldChange,
		onAddImages,
		onRemoveImage,
		onDeleteImage,
		onSetCover,
		preview
	}: Props = $props()

	let mdEl = $state<HTMLTextAreaElement | null>(null)
	let coverFileInput: HTMLInputElement | null = null
	let imagesFileInput: HTMLInputElement | null = null
	let urlInput = $state('')
	let notice = $state<string | null>(null)
	/** 粘贴剪贴板图片时是否自动插入占位符（对齐旧站 editor 的行为，默认开） */
	let pasteUrls = $state(true)

	const tagsText = $derived(form.tags.join(', '))

	function markdownFor(image: LocalImage): string {
		const target = image.item.type === 'url' ? image.item.url : `local-image:${image.id}`
		return `![](${target})`
	}

	function idFor(item: ImageItem): string {
		if (item.type === 'url') return item.url
		return item.hash ?? item.file.name
	}

	function makeLocalImage(item: ImageItem): LocalImage {
		return { id: idFor(item), item }
	}

	function localImagesFromFiles(files: File[]): LocalImage[] {
		const picked = files.filter(file => file.type.startsWith('image/'))
		return picked.map(file => ({
			id: crypto.randomUUID(),
			item: { type: 'file', file, previewUrl: URL.createObjectURL(file) } as ImageItem
		}))
	}

	/** 在选区处插入文本，并把光标放到插入内容之后 */
	function insertAtCursor(text: string) {
		const el = mdEl
		const current = form.md ?? ''
		if (!el) {
			onFieldChange('md', current + text)
			return
		}

		const start = el.selectionStart ?? current.length
		const end = el.selectionEnd ?? start
		const before = current.slice(0, start)
		const after = current.slice(end)

		let prefix = ''
		let suffix = ''
		if (before && !before.endsWith('\n')) prefix = '\n'
		if (after && !after.startsWith('\n')) suffix = '\n'
		const inserted = `${prefix}${text}${suffix}`
		const cursor = start + inserted.length

		onFieldChange('md', before + inserted + after)
		requestAnimationFrame(() => {
			el.focus()
			el.setSelectionRange(cursor, cursor)
		})
	}

	function handleImageFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement
		const files = [...(input.files ?? [])]
		if (input) input.value = ''
		if (files.length === 0) return

		const added = localImagesFromFiles(files)
		if (added.length === 0) {
			notice = '只能插入图片文件。'
			return
		}
		notice = null
		onAddImages(added, 'file')
		insertAtCursor(added.map(markdownFor).join('\n'))
	}

	async function handlePaste(event: ClipboardEvent) {
		if (!pasteUrls) return
		const items = [...(event.clipboardData?.items ?? [])]
		const imageFiles = items.filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => Boolean(file))
		if (imageFiles.length === 0) return

		event.preventDefault()
		const added = localImagesFromFiles(imageFiles)
		if (added.length === 0) return
		onAddImages(added, 'paste')
		insertAtCursor(added.map(markdownFor).join('\n'))
	}

	function handlePasteEvent(event: ClipboardEvent) {
		void handlePaste(event)
	}

	function handleCoverFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement
		const file = input.files?.[0]
		if (input) input.value = ''
		if (!file || !file.type.startsWith('image/')) return

		const [image] = localImagesFromFiles([file])
		if (!image) return
		onAddImages([image], 'file')
		onSetCover(image.id)
	}

	function addUrlImage(raw: string) {
		const url = raw.trim()
		if (!url) return
		if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
			notice = '图片地址需要以 http(s):// 或 / 开头。'
			return
		}
		notice = null
		const image = makeLocalImage({ type: 'url', url })
		onAddImages([image], 'file')
		urlInput = ''
		insertAtCursor(`![](${url})`)
	}

	function markdownHas(image: LocalImage): boolean {
		return (form.md ?? '').includes(`(local-image:${image.id})`) || (image.item.type === 'url' && (form.md ?? '').includes(`(${image.item.url})`))
	}

	onDestroy(() => {
		for (const image of images) {
			if (image.item.type === 'file' && image.item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(image.item.previewUrl)
		}
	})
</script>

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
	<!-- 左：正文 + 预览 -->
	<section class="flex min-w-0 flex-col gap-6">
		<div class="card card-rounded relative flex flex-col gap-3">
			<div class="flex flex-wrap items-center gap-2">
				<input
					type="text"
					placeholder="标题（必填）"
					class="card-rounded min-w-[12rem] flex-1 border bg-white/70 px-3 py-2 text-sm font-medium"
					value={form.title}
					disabled={disabled}
					oninput={event => onFieldChange('title', (event.currentTarget as HTMLInputElement).value)}
				/>
				<input
					type="text"
					placeholder="slug（字母/数字/下划线/连字符）"
					class={cn('card-rounded w-full border px-3 py-2 text-sm sm:w-64', mode === 'edit' && 'text-secondary bg-black/5')}
					value={form.slug}
					readonly={mode === 'edit'}
					disabled={disabled}
					oninput={event => onFieldChange('slug', (event.currentTarget as HTMLInputElement).value)}
				/>
				{#if mode === 'edit'}
					<span class="text-secondary text-xs">编辑模式下 slug 不可修改</span>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="card-rounded border bg-white/70 px-3 py-2 text-sm" disabled={disabled} onclick={() => imagesFileInput?.click()}>
					插入本地图片
				</button>
				<input bind:this={imagesFileInput} type="file" accept="image/*" multiple class="hidden" onchange={handleImageFiles} />
				<span class="text-secondary text-xs">也可以把图片直接拖进/粘贴进正文（粘贴需放开下面的开关）</span>
			</div>

			<textarea
				bind:this={mdEl}
				placeholder="Markdown 正文（必填）。本地图片会以 (local-image:&lt;id&gt;) 占位，发布时自动替换。"
				spellcheck="false"
				class="h-[28rem] w-full resize-y rounded-2xl border bg-white/70 p-4 font-mono text-sm leading-relaxed"
				value={form.md}
				disabled={disabled}
				oninput={event => onFieldChange('md', (event.currentTarget as HTMLTextAreaElement).value)}
				onpaste={handlePasteEvent}></textarea>

			<div class="text-secondary flex flex-wrap items-center justify-between gap-2 text-xs">
				<span>{form.md.length} 字符 · {form.md.split('\n').length} 行</span>
				<label class="flex items-center gap-2 select-none">
					<input type="checkbox" bind:checked={pasteUrls} class="h-4 w-4 rounded border-gray-300" />
					粘贴剪贴板图片时自动插入占位符
				</label>
			</div>
			{#if notice}
				<p class="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800" role="alert">{notice}</p>
			{/if}
		</div>

		{#if preview}
			{@render preview()}
		{/if}
	</section>

	<!-- 右：元信息 / 封面 / 图片 -->
	<div class="flex flex-col gap-6">
		<section class="card card-rounded relative">
			<h2 class="text-sm font-medium">元信息</h2>
			<div class="mt-3 space-y-2">
				<textarea
					placeholder="摘要（可选，列表页会显示）"
					rows={3}
					class="w-full resize-none rounded-xl border bg-white/70 p-3 text-sm"
					value={form.summary}
					disabled={disabled}
					oninput={event => onFieldChange('summary', (event.currentTarget as HTMLTextAreaElement).value)}></textarea>

				<input
					type="text"
					placeholder="分类（可留空，输入新分类会自动写入 categories.json）"
					list="write-category-options"
					class="card-rounded w-full border bg-white/70 px-3 py-2 text-sm"
					value={form.category}
					disabled={disabled}
					oninput={event => onFieldChange('category', (event.currentTarget as HTMLInputElement).value)}
				/>
				<datalist id="write-category-options">
					{#each categories as category (category)}
						<option value={category}></option>
					{/each}
				</datalist>

				<input
					type="text"
					placeholder="标签，用逗号分隔（如：日记, Svelte）"
					class="card-rounded w-full border bg-white/70 px-3 py-2 text-sm"
					value={tagsText}
					disabled={disabled}
					oninput={event =>
						onFieldChange(
							'tags',
							(event.currentTarget as HTMLInputElement).value
								.split(/[,，]/)
								.map(tag => tag.trim())
								.filter(Boolean)
						)}
				/>

				<label class="flex items-center gap-2 text-xs">
					<span class="text-secondary w-10">日期</span>
					<input
						type="datetime-local"
						class="card-rounded flex-1 border bg-white/70 px-3 py-2 text-sm"
						value={form.date}
						disabled={disabled}
						oninput={event => onFieldChange('date', (event.currentTarget as HTMLInputElement).value)}
					/>
				</label>

				<label class="flex items-center gap-2 text-xs select-none">
					<input
						type="checkbox"
						class="h-4 w-4 rounded border-gray-300"
						checked={form.hidden}
						disabled={disabled}
						onchange={event => onFieldChange('hidden', (event.currentTarget as HTMLInputElement).checked)}
					/>
					隐藏这篇文章（列表页不显示）
				</label>
			</div>
		</section>

		<section class="card card-rounded relative">
			<h2 class="text-sm font-medium">封面</h2>
			<div class="mt-3 h-36 overflow-hidden rounded-2xl border bg-white/50">
				{#if coverUrl}
					<img src={coverUrl} alt="封面预览" class="h-full w-full object-cover" />
				{:else}
					<div class="text-secondary grid h-full w-full place-items-center text-xs">未设置封面</div>
				{/if}
			</div>

			<div class="mt-3 flex flex-wrap items-center gap-2">
				<button type="button" class="card-rounded border bg-white/70 px-3 py-2 text-xs" disabled={disabled} onclick={() => coverFileInput?.click()}>
					上传本地封面
				</button>
				<input bind:this={coverFileInput} type="file" accept="image/*" class="hidden" onchange={handleCoverFile} />
				{#if coverUrl}
					<button type="button" class="card-rounded border bg-white/70 px-3 py-2 text-xs text-red-600" disabled={disabled} onclick={() => onSetCover(null)}>
						取消封面
					</button>
				{/if}
			</div>

			<div class="mt-3 flex items-center gap-2">
				<input
					type="text"
					placeholder="或粘贴图片 URL"
					class="card-rounded min-w-0 flex-1 border bg-white/70 px-3 py-2 text-xs"
					bind:value={urlInput}
					disabled={disabled}
				/>
				<button type="button" class="card-rounded border bg-white/70 px-3 py-2 text-xs" disabled={disabled} onclick={() => addUrlImage(urlInput)}>
					用 URL 作封面
				</button>
			</div>

			{#if images.length > 0}
				<p class="text-secondary mt-3 text-xs">也可以从下面的图片里点「设为封面」。</p>
			{/if}
		</section>

		<section class="card card-rounded relative">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-medium">本地图片（{images.length}）</h2>
				<a class="text-secondary text-xs hover:underline" href="/image-toolbox" target="_blank" rel="noreferrer">压缩工具</a>
			</div>

			{#if images.length === 0}
				<p class="text-secondary mt-3 text-xs">还没有图片。上传后会在正文里插入 (local-image:&lt;id&gt;) 占位符，发布时统一上传到仓库。</p>
			{:else}
				<ul class="mt-3 grid grid-cols-2 gap-3">
					{#each images as image (image.id)}
						{@const src = image.item.type === 'url' ? image.item.url : image.item.previewUrl}
						{@const isCover = coverId === image.id}
						<li class={cn('overflow-hidden rounded-xl border bg-white/50', isCover && 'ring-2 ring-brand')}>
							<div class="relative aspect-video">
								<img src={src} alt={image.id} draggable={false} class="h-full w-full object-cover" />
								{#if isCover}
									<span class="bg-brand absolute top-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] text-white">封面</span>
								{/if}
							</div>
							<div class="flex flex-wrap gap-1 p-2 text-[11px]">
								{#if image.item.type === 'file' && !isCover}
									<button type="button" class="card-rounded border bg-white/70 px-2 py-1" onclick={() => onSetCover(image.id)}>设为封面</button>
								{/if}
								{#if markdownHas(image)}
									<button type="button" class="card-rounded border bg-white/70 px-2 py-1" onclick={() => onRemoveImage(image.id)}>移出正文</button>
								{:else}
									<button type="button" class="card-rounded border bg-white/70 px-2 py-1" onclick={() => insertAtCursor(markdownFor(image))}>插入正文</button>
								{/if}
								<button
									type="button"
									class="card-rounded border bg-white/70 px-2 py-1 text-red-600"
									onclick={() => {
										if (isCover) onSetCover(null)
										if (markdownHas(image)) onRemoveImage(image.id)
										onDeleteImage(image.id)
									}}>删除</button
								>
							</div>
							<p class="text-secondary truncate px-2 pb-2 text-[10px]" title={image.item.type === 'file' ? image.item.file.name : image.item.url}>
								{image.item.type === 'file' ? image.item.file.name : image.item.url}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
