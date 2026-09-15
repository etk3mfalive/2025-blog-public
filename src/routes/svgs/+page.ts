import aboutFilled from '$lib/svgs/about-filled.svg?raw'
import aboutOutline from '$lib/svgs/about-outline.svg?raw'
import dots from '$lib/svgs/dots.svg?raw'
import dragger from '$lib/svgs/dragger.svg?raw'
import email from '$lib/svgs/email.svg?raw'
import facebook from '$lib/svgs/facebook.svg?raw'
import github from '$lib/svgs/github.svg?raw'
import instagram from '$lib/svgs/instagram.svg?raw'
import juejin from '$lib/svgs/juejin.svg?raw'
import music from '$lib/svgs/music.svg?raw'
import pen from '$lib/svgs/pen.svg?raw'
import pictures from '$lib/svgs/pictures.svg?raw'
import play from '$lib/svgs/play.svg?raw'
import projectsFilled from '$lib/svgs/projects-filled.svg?raw'
import projectsOutline from '$lib/svgs/projects-outline.svg?raw'
import qq from '$lib/svgs/qq.svg?raw'
import scrollFilled from '$lib/svgs/scroll-filled.svg?raw'
import scrollOutline from '$lib/svgs/scroll-outline.svg?raw'
import shareFilled from '$lib/svgs/share-filled.svg?raw'
import shareOutline from '$lib/svgs/share-outline.svg?raw'
import shortLine from '$lib/svgs/short-line.svg?raw'
import tg from '$lib/svgs/tg.svg?raw'
import tiktok from '$lib/svgs/tiktok.svg?raw'
import top from '$lib/svgs/top.svg?raw'
import websiteFilled from '$lib/svgs/website-filled.svg?raw'
import websiteOutline from '$lib/svgs/website-outline.svg?raw'
import wechat from '$lib/svgs/wechat.svg?raw'
import weibo from '$lib/svgs/weibo.svg?raw'
import x from '$lib/svgs/x.svg?raw'
import bilibili from '$lib/svgs/哔哩哔哩.svg?raw'
import xiaohongshu from '$lib/svgs/小红书.svg?raw'
import zhihu from '$lib/svgs/知乎.svg?raw'

/**
 * 图标画廊（旧站 src/app/svgs/page.tsx）
 *
 * 旧站的 svgItems 由 scripts/gen-svgs-index.js 生成，且 index.ts 还是 React 组件形态；
 * 这里改成 ?raw 静态导入（Vite 直接给字符串），因此画廊收录 $lib/svgs 下的全部图标。
 */
const icons: Record<string, string> = {
	'about-filled': aboutFilled,
	'about-outline': aboutOutline,
	dots,
	dragger,
	email,
	facebook,
	github,
	instagram,
	juejin,
	music,
	pen,
	pictures,
	play,
	'projects-filled': projectsFilled,
	'projects-outline': projectsOutline,
	qq,
	'scroll-filled': scrollFilled,
	'scroll-outline': scrollOutline,
	'share-filled': shareFilled,
	'share-outline': shareOutline,
	'short-line': shortLine,
	tg,
	tiktok,
	top,
	'website-filled': websiteFilled,
	'website-outline': websiteOutline,
	wechat,
	weibo,
	x,
	哔哩哔哩: bilibili,
	小红书: xiaohongshu,
	知乎: zhihu
}

export function load() {
	const items = Object.entries(icons)
		.map(([label, raw]) => ({ label, raw }))
		.sort((a, b) => a.label.localeCompare(b.label))

	return {
		items,
		title: '图标',
		description: '站点内置的 SVG 图标画廊，点击即可复制引入语句'
	}
}
