/**
 * 文章写入层（替代旧站 write/services/push-blog.ts、delete-blog.ts、blog/services/*）
 *
 * 与旧实现的关键差别：**不再维护 public/blogs/index.json**。
 * 新站的内容层（src/lib/content.ts）以每篇的 config.json 为唯一数据源、构建期生成列表，
 * 因此这里只写 `<contentDir>/<slug>/index.md`、`config.json`、图片，以及按需更新 categories.json。
 * 这样顺手消掉了旧站"索引双写 + 读取失败静默清空"的结构性隐患。
 */
import { GITHUB, categoriesPath, postDir } from './config'
import { fileToBase64NoPrefix, getFileExt, hashFileSHA256, toBase64Utf8 } from './base64'
import {
	createBlob,
	createCommit,
	createTree,
	getRef,
	listRepoFilesRecursive,
	readTextFileFromRepo,
	type TreeItem,
	updateRef
} from './client'
import { githubAuth } from './auth.svelte'

export type BlogConfig = {
	title?: string
	tags?: string[]
	date?: string
	summary?: string
	cover?: string
	hidden?: boolean
	category?: string
}

export type ImageItem =
	| { type: 'url'; url: string; id?: string }
	| { type: 'file'; file: File; previewUrl: string; hash?: string; id?: string }

export type BlogForm = {
	slug: string
	title: string
	md: string
	tags: string[]
	date?: string
	summary?: string
	hidden?: boolean
	category?: string
}

export type PublishParams = {
	form: BlogForm
	cover?: ImageItem | null
	images?: ImageItem[]
	mode?: 'create' | 'edit'
	originalSlug?: string | null
	onProgress?: (message: string) => void
}

const SAFE_SLUG = /^[A-Za-z0-9_-]+$/

/** 本地时间 → `YYYY-MM-DDTHH:mm`（与旧站 config.json 的格式一致） */
export function formatDateTimeLocal(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function commitFiles(treeItems: TreeItem[], message: string, onProgress?: (m: string) => void): Promise<{ commitSha: string; files: string[] }> {
	const { owner, repo, branch } = GITHUB
	const token = await githubAuth.getToken()

	onProgress?.('正在获取分支信息…')
	const baseSha = await getRef(token, owner, repo, branch)

	onProgress?.('正在创建文件树…')
	const treeSha = await createTree(token, owner, repo, treeItems, baseSha)

	onProgress?.('正在创建提交…')
	const commitSha = await createCommit(token, owner, repo, message, treeSha, [baseSha])

	onProgress?.('正在更新分支…')
	await updateRef(token, owner, repo, branch, commitSha)

	return { commitSha, files: treeItems.map(item => item.path) }
}

/** 读取仓库里的分类列表 */
export async function readCategoriesFromRepo(): Promise<string[]> {
	const token = await githubAuth.getToken()
	const raw = await readTextFileFromRepo(token, GITHUB.owner, GITHUB.repo, categoriesPath(), GITHUB.branch)
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw) as { categories?: string[] }
		return (parsed.categories ?? []).filter(Boolean)
	} catch {
		return []
	}
}

/** 写回分类列表（去重、去空） */
export async function saveCategories(categories: string[]): Promise<{ commitSha: string; files: string[] }> {
	const unique = [...new Set(categories.map(c => c.trim()).filter(Boolean))]
	const blob = await createBlob(
		await githubAuth.getToken(),
		GITHUB.owner,
		GITHUB.repo,
		toBase64Utf8(JSON.stringify({ categories: unique }, null, '\t') + '\n'),
		'base64'
	)
	return commitFiles(
		[{ path: categoriesPath(), mode: '100644', type: 'blob', sha: blob }],
		`更新分类: ${unique.join(', ') || '(空)'}`
	)
}

/**
 * 发布 / 更新文章：一次提交写完 md + config + 图片（+ 必要时分类）
 */
export async function publishBlog(params: PublishParams): Promise<{ commitSha: string; files: string[] }> {
	const { form, cover, images, mode = 'create', originalSlug, onProgress } = params
	const { owner, repo } = GITHUB

	if (!form?.slug) throw new Error('需要 slug')
	if (!form.title?.trim()) throw new Error('需要标题')
	if (!SAFE_SLUG.test(form.slug)) throw new Error('slug 只允许字母、数字、下划线与连字符')
	if (mode === 'edit' && originalSlug && originalSlug !== form.slug) {
		throw new Error('编辑模式下不支持修改 slug，请保持原 slug 不变')
	}

	const token = await githubAuth.getToken()
	const dir = postDir(form.slug)
	const treeItems: TreeItem[] = []

	// ---- 图片：按内容 SHA-256 前 16 位命名，同哈希只上传一次 ----
	let markdown = form.md
	const uploaded = new Set<string>()
	let coverPath: string | undefined

	const localImages: Array<{ img: Extract<ImageItem, { type: 'file' }>; id: string }> = []
	for (const img of images ?? []) if (img.type === 'file') localImages.push({ img, id: img.id ?? img.hash ?? img.file.name })
	if (cover?.type === 'file') localImages.push({ img: cover, id: cover.id ?? cover.hash ?? cover.file.name })

	if (localImages.length > 0) onProgress?.(`正在上传 ${localImages.length} 张图片…`)

	for (const { img, id } of localImages) {
		const hash = img.hash || (await hashFileSHA256(img.file))
		img.hash = hash
		const filename = `${hash}${getFileExt(img.file.name).toLowerCase()}`
		const publicPath = `/${GITHUB.contentDir.split('/').pop()}/${form.slug}/${filename}`

		if (!uploaded.has(hash)) {
			const contentBase64 = await fileToBase64NoPrefix(img.file)
			const blobSha = await createBlob(token, owner, repo, contentBase64, 'base64')
			treeItems.push({ path: `${dir}/${filename}`, mode: '100644', type: 'blob', sha: blobSha })
			uploaded.add(hash)
		}

		markdown = markdown.split(`(local-image:${id})`).join(`(${publicPath})`)
		if (cover?.type === 'file' && (cover.id ?? cover.hash ?? cover.file.name) === id) coverPath = publicPath
	}

	if (cover?.type === 'url') coverPath = cover.url
	// 编辑时若没有重新选封面，保留原有 cover
	if (!coverPath && mode === 'edit' && originalSlug) {
		const existing = await readConfigFromRepo(originalSlug)
		coverPath = existing?.cover
	}

	// ---- 正文与元数据 ----
	onProgress?.('正在写入正文与元数据…')
	const mdBlob = await createBlob(token, owner, repo, toBase64Utf8(markdown), 'base64')
	treeItems.push({ path: `${dir}/index.md`, mode: '100644', type: 'blob', sha: mdBlob })

	const config: BlogConfig = {
		title: form.title.trim(),
		tags: form.tags.filter(Boolean),
		date: form.date || formatDateTimeLocal(),
		summary: form.summary?.trim() || undefined,
		cover: coverPath,
		hidden: form.hidden ?? false,
		category: form.category?.trim() || undefined
	}
	const configJson = JSON.stringify(config, null, '\t') + '\n'
	const configBlob = await createBlob(token, owner, repo, toBase64Utf8(configJson), 'base64')
	treeItems.push({ path: `${dir}/config.json`, mode: '100644', type: 'blob', sha: configBlob })

	// ---- 新分类：顺手更新 categories.json ----
	const category = config.category
	if (category) {
		try {
			const existing = await readCategoriesFromRepo()
			if (!existing.includes(category)) {
				onProgress?.(`正在新增分类「${category}」…`)
				const next = [...existing, category]
				const catBlob = await createBlob(
					token,
					owner,
					repo,
					toBase64Utf8(JSON.stringify({ categories: next }, null, '\t') + '\n'),
					'base64'
				)
				treeItems.push({ path: categoriesPath(), mode: '100644', type: 'blob', sha: catBlob })
			}
		} catch {
			// 分类更新失败不影响文章发布
		}
	}

	const message = mode === 'edit' ? `更新文章: ${form.slug}` : `新增文章: ${form.slug}`
	return commitFiles(treeItems, message, onProgress)
}

/** 从仓库读某篇文章的 config.json（编辑时用于保留未改动的字段） */
export async function readConfigFromRepo(slug: string): Promise<BlogConfig | null> {
	if (!SAFE_SLUG.test(slug)) return null
	const token = await githubAuth.getToken()
	const raw = await readTextFileFromRepo(token, GITHUB.owner, GITHUB.repo, `${postDir(slug)}/config.json`, GITHUB.branch)
	if (!raw) return null
	try {
		return JSON.parse(raw) as BlogConfig
	} catch {
		return null
	}
}

/** 从仓库读正文（编辑页用，保证拿到的是仓库最新版本而不是已部署版本） */
export async function readMarkdownFromRepo(slug: string): Promise<string | null> {
	if (!SAFE_SLUG.test(slug)) return null
	const token = await githubAuth.getToken()
	return readTextFileFromRepo(token, GITHUB.owner, GITHUB.repo, `${postDir(slug)}/index.md`, GITHUB.branch)
}

/** 删除文章：把该目录下所有文件标记为删除（sha: null），一次提交 */
export async function deleteBlog(slug: string, onProgress?: (m: string) => void): Promise<{ commitSha: string; files: string[] }> {
	if (!SAFE_SLUG.test(slug)) throw new Error('slug 非法')

	const token = await githubAuth.getToken()
	onProgress?.('正在收集文章文件…')
	const files = await listRepoFilesRecursive(token, GITHUB.owner, GITHUB.repo, postDir(slug), GITHUB.branch)
	if (files.length === 0) throw new Error('文章不存在或已删除')

	const treeItems: TreeItem[] = files.map(path => ({ path, mode: '100644', type: 'blob', sha: null }))
	return commitFiles(treeItems, `删除文章: ${slug}`, onProgress)
}

/** 批量删除 */
export async function batchDeleteBlogs(slugs: string[], onProgress?: (m: string) => void): Promise<{ commitSha: string; files: string[] }> {
	const token = await githubAuth.getToken()
	const treeItems: TreeItem[] = []

	for (const slug of [...new Set(slugs)].filter(Boolean)) {
		if (!SAFE_SLUG.test(slug)) continue
		onProgress?.(`正在收集 ${slug} 的文件…`)
		const files = await listRepoFilesRecursive(token, GITHUB.owner, GITHUB.repo, postDir(slug), GITHUB.branch)
		for (const path of files) treeItems.push({ path, mode: '100644', type: 'blob', sha: null })
	}

	if (treeItems.length === 0) throw new Error('没有可删除的文章')
	return commitFiles(treeItems, `批量删除文章: ${slugs.join(', ')}`, onProgress)
}
