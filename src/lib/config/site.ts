import siteContentJson from '$lib/data/site-content.json'
import cardStylesJson from '$lib/data/card-styles.json'

/**
 * 站点配置与卡片布局（编译期从 JSON 读取，迁移期与旧站保持同一份数据）
 * 这些值在构建时被烘焙进 HTML，因此修改后需要重新构建。
 */
export type SiteContent = typeof siteContentJson
export type CardStyles = typeof cardStylesJson
export type CardKey = keyof CardStyles

export const siteContent = siteContentJson as SiteContent
export const cardStyles = cardStylesJson as CardStyles

export function cardStyle<K extends CardKey>(key: K): CardStyles[K] {
	return cardStyles[key]
}

/** 供 CSS 变量注入：把 theme + backgroundColors 变成 :root 上的变量 */
export function themeStyleString(): string {
	const t = siteContent.theme
	return [
		`--color-brand:${t.colorBrand}`,
		`--color-primary:${t.colorPrimary}`,
		`--color-secondary:${t.colorSecondary}`,
		`--color-brand-secondary:${t.colorBrandSecondary}`,
		`--color-bg:${t.colorBg}`,
		`--color-border:${t.colorBorder}`,
		`--color-card:${t.colorCard}`,
		`--color-article:${t.colorArticle}`
	].join(';')
}
