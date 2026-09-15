/**
 * 站点配置与列表数据写入层（P4b 用）
 *
 * 覆盖旧站的：站点配置弹窗（site-content.json / card-styles.json）、
 * 以及 share / bloggers / pictures / snippets / about 这些列表页的数据文件。
 *
 * 仓库里这些文件的位置有两种布局，用 PUBLIC_SITE_DATA_MODE 切换：
 *   legacy（默认，迁移期：内容仍在旧仓库）—— src/config/*.json、src/app/<x>/list.json
 *   new（新仓库自己持有）              —— src/lib/data/<name>.json
 */
import { GITHUB } from './config'
import { toBase64Utf8 } from './base64'
import { createBlob, createCommit, createTree, getRef, listRepoFilesRecursive, updateRef, type TreeItem } from './client'
import { githubAuth } from './auth.svelte'

export type DataKey = 'siteContent' | 'cardStyles' | 'share' | 'bloggers' | 'pictures' | 'snippets' | 'about'

const LEGACY_LAYOUT: Record<DataKey, string> = {
	siteContent: 'src/config/site-content.json',
	cardStyles: 'src/config/card-styles.json',
	share: 'src/app/share/list.json',
	bloggers: 'src/app/bloggers/list.json',
	pictures: 'src/app/pictures/list.json',
	snippets: 'src/app/snippets/list.json',
	about: 'src/app/about/list.json'
}

const NEW_LAYOUT: Record<DataKey, string> = {
	siteContent: 'src/lib/data/site-content.json',
	cardStyles: 'src/lib/data/card-styles.json',
	share: 'src/lib/data/share.json',
	bloggers: 'src/lib/data/bloggers.json',
	pictures: 'src/lib/data/pictures.json',
	snippets: 'src/lib/data/snippets.json',
	about: 'src/lib/data/about.json'
}

const MODE = import.meta.env.PUBLIC_SITE_DATA_MODE === 'new' ? 'new' : 'legacy'

export function dataPath(key: DataKey): string {
	return (MODE === 'new' ? NEW_LAYOUT : LEGACY_LAYOUT)[key]
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

	return { commitSha, files: treeItems.map(i => i.path) }
}

/** 一次性提交多个 JSON 数据文件（例如站点配置 + 卡片布局） */
export async function saveJsonFiles(
	files: Array<{ key: DataKey; value: unknown }>,
	message: string,
	onProgress?: (m: string) => void
): Promise<{ commitSha: string; files: string[] }> {
	if (files.length === 0) throw new Error('没有需要保存的内容')
	const token = await githubAuth.getToken()
	const treeItems: TreeItem[] = []

	for (const file of files) {
		const json = JSON.stringify(file.value, null, '\t') + '\n'
		const blob = await createBlob(token, GITHUB.owner, GITHUB.repo, toBase64Utf8(json), 'base64')
		treeItems.push({ path: dataPath(file.key), mode: '100644', type: 'blob', sha: blob })
	}

	return commitFiles(treeItems, message, onProgress)
}

/** 上传一组图片到仓库目录，返回 { 本地文件名 → 仓库路径 } */
export async function uploadImages(
	folder: string,
	files: Array<{ name: string; hash: string; base64: string; ext: string }>,
	message: string,
	onProgress?: (m: string) => void
): Promise<{ commitSha: string; uploaded: Record<string, string> }> {
	if (files.length === 0) return { commitSha: '', uploaded: {} }
	const token = await githubAuth.getToken()
	const treeItems: TreeItem[] = []
	const uploaded: Record<string, string> = {}
	const dir = folder.replace(/\/+$/, '')

	for (const file of files) {
		const filename = `${file.hash}${file.ext.toLowerCase()}`
		const path = `${dir}/${filename}`
		const blob = await createBlob(token, GITHUB.owner, GITHUB.repo, file.base64, 'base64')
		treeItems.push({ path, mode: '100644', type: 'blob', sha: blob })
		uploaded[file.name] = path
	}

	const result = await commitFiles(treeItems, message, onProgress)
	return { commitSha: result.commitSha, uploaded }
}

/** 删除仓库里的文件（例如替换掉的旧图片） */
export async function deleteRepoFiles(paths: string[], message: string, onProgress?: (m: string) => void) {
	if (paths.length === 0) return { commitSha: '', files: [] }
	const treeItems: TreeItem[] = paths.map(path => ({ path, mode: '100644', type: 'blob', sha: null }))
	return commitFiles(treeItems, message, onProgress)
}

/** 列出某个目录下已存在的文件（用于清理不再引用的图片） */
export async function listFolder(path: string): Promise<string[]> {
	const token = await githubAuth.getToken()
	return listRepoFilesRecursive(token, GITHUB.owner, GITHUB.repo, path, GITHUB.branch)
}
