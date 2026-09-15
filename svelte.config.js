import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// 纯静态输出：构建期生成全部 HTML，交给 Vercel / 任意静态托管
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: false
		}),
		alias: {
			$content: 'src/lib/content',
			$components: 'src/lib/components'
		}
	}
}

export default config
