/**
 * GitHub 写入层的仓库配置
 *
 * 内容与站点数据都在本仓库里：
 * - 文章内容：public/blogs/**（写作控制台提交到这里，构建时同步进 static/）
 * - 站点配置与列表数据：src/lib/data/*.json
 *
 * 这些值会打进客户端包，本来就不是秘密（真正的秘密是私钥文件，只在浏览器里选择、不入库）。
 * App ID 用 PUBLIC_GITHUB_APP_ID 覆盖。
 */

export const GITHUB = {
	owner: import.meta.env.PUBLIC_GITHUB_OWNER || 'etk3mfalive',
	repo: import.meta.env.PUBLIC_GITHUB_REPO || '2025-blog-public',
	branch: import.meta.env.PUBLIC_GITHUB_BRANCH || 'main',
	appId: import.meta.env.PUBLIC_GITHUB_APP_ID || '3171094',
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
