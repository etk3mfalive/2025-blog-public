// See https://svelte.dev/docs/kit/types#app
declare global {
	namespace App {}

	interface ImportMetaEnv {
		readonly PUBLIC_SITE_URL?: string
		readonly PUBLIC_LIKE_ENDPOINT?: string
		readonly PUBLIC_GA_ID?: string
		readonly PUBLIC_GITHUB_OWNER?: string
		readonly PUBLIC_GITHUB_REPO?: string
		readonly PUBLIC_GITHUB_BRANCH?: string
		readonly PUBLIC_GITHUB_APP_ID?: string
		readonly PUBLIC_CONTENT_DIR?: string
	}
}

declare module '*.svg?raw' {
	const content: string
	export default content
}

declare module '*.svg' {
	const src: string
	export default src
}

export {}
