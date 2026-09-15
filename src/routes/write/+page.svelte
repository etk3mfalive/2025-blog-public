<script lang="ts">
	/**
	 * 写作控制台（新建 + 编辑同一个页面，靠 ?slug= 区分模式）
	 *
	 * 为什么不用 /write/[slug] 动态路由：本站是纯静态导出（adapter-static + prerender），
	 * 动态路由需要 entries 枚举，否则预渲染会报 unseen routes；因此编辑模式复用这个页面，
	 * 从 page.url.searchParams.get('slug') 取 slug。
	 *
	 * 内容读取两级（仅编辑模式）：
	 * 1. 有私钥/令牌 → readMarkdownFromRepo + readConfigFromRepo，拿仓库最新版本（可发布/删除）；
	 * 2. 还没有私钥 → fetch('/blogs/<slug>/config.json' + '/blogs/<slug>/index.md') 只读兜底，
	 *    页面提示"当前显示的是线上版本"，提供私钥后自动切回仓库版本。
	 */
	import { onMount, untrack } from 'svelte'
	import { page } from '$app/state'
	import { replaceState } from '$app/navigation'
	import AuthPanel from '$lib/components/write/AuthPanel.svelte'
	import Editor, { type EditorFormValues, type LocalImage } from '$lib/components/write/Editor.svelte'
	import Preview from '$lib/components/write/Preview.svelte'
	import { githubAuth } from '$lib/github/auth.svelte'
	import { publishBlog, deleteBlog, readCategoriesFromRepo, readConfigFromRepo, readMarkdownFromRepo, formatDateTimeLocal } from '$lib/github/blog'
	import type { BlogConfig, ImageItem } from '$lib/github/blog'

	const SAFE_SLUG = /^[A-Za-z0-9_-]+$/

	const slug = $derived(page.url.searchParams.get('slug') ?? '')
	const isEdit = $derived(slug.length > 0)
	const slugValid = $derived(!isEdit || SAFE_SLUG.test(slug))

	let form = $state<EditorFormValues>({
		// untrack：这里只要初始值（编辑模式下由 loadContent 覆盖），不需要建立响应式依赖
		slug: untrack(() => slug),
		title: '',
		md: '',
		tags: [],
		date: formatDateTimeLocal(),
		summary: '',
		hidden: false,
		category: ''
	})
	let images = $state<LocalImage[]>([])
	let coverId = $state<string | null>(null)
	let coverUrl = $state('')
	let categories = $state<string[]>([])
	let categoriesError = $state<string | null>(null)
	let loading = $state(false)
	let loadedFrom = $state<'repo' | 'online' | null>(null)
	let loadError = $state<string | null>(null)
	let sourceNotice = $state<string | null>(null)
	/** 仓库版本最多尝试一次，避免仓库里没有这篇文章时反复重试 */
	let repoAttempted = false
	/** 用户是否已经动过表单：动过就不再被自动重载覆盖 */
	let touched = false
	let showPreview = $state(false)
	let busy = $state(false)
	let progress = $state<string | null>(null)
	let error = $state<string | null>(null)
	let result = $state<{ commitSha: string; files: string[] } | null>(null)
	let confirmDelete = $state(false)
	let deleted = $state<{ commitSha: string } | null>(null)

	const coverImage = $derived(coverId ? (images.find(image => image.id === coverId) ?? null) : null)
	const effectiveCoverUrl = $derived(coverImage ? (coverImage.item.type === 'url' ? coverImage.item.url : coverImage.item.previewUrl) : coverUrl)
	const actionDisabled = $derived(busy || !githubAuth.canPublish || !slugValid || Boolean(deleted))

	onMount(() => {
		githubAuth.init()
		if (isEdit) void loadContent()
		void loadCategories()
	})

	// 提供私钥后：只读兜底内容 → 自动切到仓库最新版本（失败过、或用户已经开始改，就不再重载）
	$effect(() => {
		if (isEdit && loadedFrom === 'online' && !repoAttempted && !touched && githubAuth.canPublish) void loadContent()
	})

	async function loadContent() {
		if (!slug || !SAFE_SLUG.test(slug)) {
			loading = false
			loadError = 'slug 非法，无法编辑。'
			return
		}

		loading = true
		loadError = null
		sourceNotice = null
		try {
			if (githubAuth.canPublish && !repoAttempted) {
				repoAttempted = true
				const [md, config] = await Promise.all([readMarkdownFromRepo(slug), readConfigFromRepo(slug)])
				if (md === null || config === null) throw new Error('仓库里找不到这篇文章（index.md / config.json 缺失）')
				applyContent(md, config)
				loadedFrom = 'repo'
				return
			}

			const [md, config] = await Promise.all([fetchOnlineMarkdown(slug), fetchOnlineConfig(slug)])
			if (md === null && config === null && loadedFrom !== 'online') throw new Error('既读不到仓库版本，也找不到线上构建产物，请检查 slug 是否正确')
			applyContent(md ?? '', config ?? {})
			loadedFrom = 'online'
			sourceNotice = '当前显示的是线上版本（构建产物）。提供 GitHub App 私钥后会自动切换到仓库里的最新内容，才能保存改动。'
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			// 已经有线上兜底内容时不把整页换成错误页，改成顶部提示，避免丢掉正在编辑的内容
			if (loadedFrom === 'online') {
				sourceNotice = `读取仓库版本失败（${message}），当前仍显示线上版本；发布时会以你眼前的表单内容为准。`
			} else {
				loadError = message
			}
		} finally {
			loading = false
		}
	}

	async function fetchOnlineMarkdown(target: string): Promise<string | null> {
		const response = await fetch(`/blogs/${encodeURIComponent(target)}/index.md`)
		if (!response.ok) return null
		return await response.text()
	}

	async function fetchOnlineConfig(target: string): Promise<BlogConfig | null> {
		try {
			const response = await fetch(`/blogs/${encodeURIComponent(target)}/config.json`)
			if (!response.ok) return null
			return (await response.json()) as BlogConfig
		} catch {
			return null
		}
	}

	function applyContent(md: string, config: BlogConfig) {
		touched = false
		form = {
			slug,
			title: config.title ?? slug,
			md,
			tags: config.tags ?? [],
			date: config.date || formatDateTimeLocal(),
			summary: config.summary ?? '',
			hidden: config.hidden ?? false,
			category: config.category ?? ''
		}
		coverUrl = config.cover ?? ''
		coverId = null
	}

	async function loadCategories() {
		if (!githubAuth.canPublish) return
		try {
			categories = await readCategoriesFromRepo()
			categoriesError = null
		} catch (err) {
			categoriesError = err instanceof Error ? err.message : String(err)
		}
	}

	function updateField<K extends keyof EditorFormValues>(key: K, value: EditorFormValues[K]) {
		touched = true
		form[key] = value
	}

	function addImages(added: LocalImage[]) {
		images = [...images, ...added]
		if (!isEdit && !coverId) {
			const firstFile = added.find(image => image.item.type === 'file')
			if (firstFile) coverId = firstFile.id
		}
	}

	function deleteImage(id: string) {
		const found = images.find(image => image.id === id)
		if (found?.item.type === 'file' && found.item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(found.item.previewUrl)
		images = images.filter(image => image.id !== id)
		if (coverId === id) coverId = null
	}

	function removePlaceholderFromMd(id: string) {
		const placeholder = `(local-image:${id})`
		touched = true
		form.md = form.md
			.split('\n')
			.filter(line => !line.includes(placeholder))
			.join('\n')
	}

	/** 预览时把 (local-image:<id>) 换成能显示的地址 */
	function resolveLocalImage(id: string): string | null {
		const found = images.find(image => image.id === id)
		if (!found) return null
		return found.item.type === 'file' ? found.item.previewUrl : found.item.url
	}

	function validate(): string | null {
		if (!isEdit) {
			if (!form.slug.trim()) return 'slug 不能为空。'
			if (!SAFE_SLUG.test(form.slug)) return 'slug 只允许字母、数字、下划线与连字符。'
		} else if (!slugValid) {
			return 'slug 只允许字母、数字、下划线与连字符。'
		}
		if (!form.title.trim()) return '标题不能为空。'
		if (!form.md.trim()) return '正文不能为空。'
		return null
	}

	async function publish() {
		const invalid = validate()
		if (invalid) {
			error = invalid
			return
		}

		busy = true
		error = null
		result = null
		progress = null
		try {
			const targetSlug = isEdit ? slug : form.slug.trim()
			const cover: ImageItem | null = coverImage ? coverImage.item : coverUrl ? { type: 'url', url: coverUrl } : null
			const others = images.filter(image => image.id !== coverId).map(image => image.item)
			const published = await publishBlog({
				form: {
					slug: targetSlug,
					title: form.title.trim(),
					md: form.md,
					tags: form.tags,
					date: form.date || undefined,
					summary: form.summary.trim() || undefined,
					hidden: form.hidden,
					category: form.category.trim() || undefined
				},
				cover,
				images: others,
				mode: isEdit ? 'edit' : 'create',
				originalSlug: isEdit ? slug : null,
				onProgress: message => (progress = message)
			})
			result = published
			if (isEdit) {
				loadedFrom = 'repo'
				sourceNotice = null
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err)
		} finally {
			busy = false
			progress = null
		}
	}

	async function remove() {
		busy = true
		error = null
		progress = null
		try {
			const removed = await deleteBlog(slug, message => (progress = message))
			deleted = { commitSha: removed.commitSha }
			confirmDelete = false
		} catch (err) {
			error = err instanceof Error ? err.message : String(err)
		} finally {
			busy = false
			progress = null
		}
	}

	/** 清空表单并回到新建模式（URL 去掉 ?slug=） */
	function startOver() {
		for (const image of images) {
			if (image.item.type === 'file' && image.item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(image.item.previewUrl)
		}
		images = []
		coverId = null
		coverUrl = ''
		loading = false
		loadedFrom = null
		loadError = null
		sourceNotice = null
		repoAttempted = false
		touched = false
		error = null
		result = null
		deleted = null
		confirmDelete = false
		form = { slug: '', title: '', md: '', tags: [], date: formatDateTimeLocal(), summary: '', hidden: false, category: form.category }
		if (isEdit) void replaceState('/write', {})
	}
</script>

<svelte:head>
	<title>{isEdit ? `编辑 ${form.title || slug}` : '新建文章'} | 写作控制台</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-col gap-6 py-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			{#if isEdit}
				<a class="text-secondary hover:text-brand text-xs transition-colors" href={`/blog/${slug}`}>← 查看文章</a>
				<h1 class="mt-2 text-2xl font-bold">编辑文章</h1>
				<p class="text-secondary mt-1 text-xs">
					{slug} ·
					{loadedFrom === 'repo' ? '内容来自仓库最新版本' : loadedFrom === 'online' ? '内容来自线上构建产物' : '加载中…'}
				</p>
			{:else}
				<h1 class="text-2xl font-bold">写作控制台</h1>
				<p class="text-secondary mt-1 text-xs">浏览器内直接提交到 GitHub 仓库 · 新建文章</p>
			{/if}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class="card-rounded border bg-white/70 px-4 py-2 text-sm" onclick={() => (showPreview = !showPreview)}>
				{showPreview ? '收起预览' : '打开预览'}
			</button>
			{#if isEdit && !deleted}
				<button
					type="button"
					class="card-rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
					disabled={actionDisabled}
					onclick={() => (confirmDelete = true)}>删除</button
				>
			{/if}
			<button type="button" class="brand-btn" disabled={actionDisabled} onclick={publish}>
				{busy
					? progress || (isEdit ? '提交中…' : '发布中…')
					: result
						? isEdit
							? '已更新'
							: '已发布'
						: githubAuth.canPublish
							? isEdit
								? '更新'
								: '发布'
							: '请先提供私钥'}
			</button>
		</div>
	</div>

	<AuthPanel />

	{#if categoriesError && !isEdit}
		<p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="alert">
			分类列表读取失败（不影响发布）：{categoriesError}
		</p>
	{/if}

	{#if isEdit && !slugValid}
		<p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">slug 非法，无法编辑。</p>
	{:else if isEdit && loading}
		<p class="text-secondary p-6 text-center text-sm">正在加载文章…</p>
	{:else if isEdit && loadError}
		<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
			<p>加载失败：{loadError}</p>
			<div class="mt-3 flex gap-2">
				<button type="button" class="card-rounded border bg-white/70 px-3 py-1.5 text-xs" onclick={() => loadContent()}>重试</button>
				<a class="card-rounded border bg-white/70 px-3 py-1.5 text-xs" href={`/blog/${slug}`}>查看线上文章</a>
			</div>
		</div>
	{:else if deleted}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
			<p class="font-medium">已删除：{deleted.commitSha.slice(0, 7)}</p>
			<p class="mt-1 text-xs">等 Vercel 部署完成后 /blog/{slug} 才会消失。仓库 history 里仍可恢复。</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<a class="card-rounded border bg-white/70 px-3 py-1.5 text-xs" href="/blog">回博客列表</a>
				<button type="button" class="card-rounded border bg-white/70 px-3 py-1.5 text-xs" onclick={startOver}>写新文章</button>
			</div>
		</div>
	{:else}
		{#if sourceNotice}
			<p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800" role="alert">{sourceNotice}</p>
		{/if}

		{#if confirmDelete}
			<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
				<p class="font-medium">确定删除《{form.title || slug}》吗？该操作不可恢复。</p>
				<p class="mt-1 text-xs">会删除仓库里 {slug} 目录下的全部文件（正文、配置与图片），一次提交完成。</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<button type="button" class="card-rounded border border-red-300 bg-red-600 px-4 py-1.5 text-xs text-white" disabled={busy} onclick={remove}>
						{busy ? progress || '删除中…' : '确认删除'}
					</button>
					<button type="button" class="card-rounded border bg-white/70 px-4 py-1.5 text-xs" disabled={busy} onclick={() => (confirmDelete = false)}>取消</button>
				</div>
			</div>
		{/if}

		{#if error}
			<p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{isEdit ? '操作失败' : '发布失败'}：{error}</p>
		{/if}

		{#if result}
			<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
				<p class="font-medium">提交成功：{result.commitSha.slice(0, 7)}</p>
				<p class="mt-1 text-xs">
					共写入 {result.files.length} 个文件。等 Vercel 部署完成后刷新才能看到：
					<a class="underline underline-offset-4" href={`/blog/${isEdit ? slug : form.slug}`}>/blog/{isEdit ? slug : form.slug}</a>
				</p>
				{#if !isEdit}
					<div class="mt-3 flex flex-wrap gap-2">
						<a class="card-rounded border bg-white/70 px-3 py-1.5 text-xs" href="/blog">回博客列表</a>
						<button type="button" class="card-rounded border bg-white/70 px-3 py-1.5 text-xs" onclick={startOver}>再写一篇</button>
					</div>
				{/if}
			</div>
		{/if}

		<Editor
			mode={isEdit ? 'edit' : 'create'}
			{form}
			{images}
			{coverId}
			coverUrl={effectiveCoverUrl}
			{categories}
			disabled={busy}
			onFieldChange={updateField}
			onAddImages={addImages}
			onRemoveImage={removePlaceholderFromMd}
			onDeleteImage={deleteImage}
			onSetCover={id => {
				coverId = id
				if (id !== null) coverUrl = ''
			}}
		>
			{#snippet preview()}
				{#if showPreview}
					<Preview
						markdown={form.md}
						title={form.title}
						slug={isEdit ? slug : form.slug}
						summary={form.summary}
						date={form.date}
						category={form.category}
						tags={form.tags}
						coverUrl={effectiveCoverUrl}
						{resolveLocalImage}
					/>
				{/if}
			{/snippet}
		</Editor>
	{/if}
</div>
