/**
 * GitHub 写入层的仓库配置
 *
 * 说明（迁移期）：
 * - 内容仍保存在旧仓库 `public/blogs/**`，新站通过 scripts/sync-content.mjs 同步到 static/blogs 后构建。
 * - 等新仓库自己持有内容时，把 PUBLIC_CONTENT_DIR 改成 `static/blogs` 即可，其余代码不用动。
 */

export const GITHUB = {
	owner: import.meta.env.PUBLIC_GITHUB_OWNER || 'etk3mfalive',
	repo: import.meta.env.PUBLIC_GITHUB_REPO || '2025-blog-public',
	branch: import.meta.env.PUBLIC_GITHUB_BRANCH || 'main',
	appId: import.meta.env.PUBLIC_GITHUB_APP_ID || '',
	/** 文章内容在仓库里的目录 */
	contentDir: (import.meta.env.PUBLIC_CONTENT_DIR || 'public/blogs').replace(/\/+$/, '')
} as const

export const GH_API = 'https://api.github.com'

export function repoConfigured(): boolean {
	return Boolean(GITHUB.owner && GITHUB.repo && GITHUB.appId)
}

export function postDir(slug: string): string {
	return `${GITHUB.contentDir}/${slug}`
}

export function categoriesPath(): string {
	return `${GITHUB.contentDir}/categories.json`
}
