<script lang="ts">
	import githubSvg from '$lib/svgs/github.svg?raw'
	import LikeButton from '$lib/components/LikeButton.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	// 旧站用 motion 做淡入 / 缩放入场，这里用 app.css 的 .card-anim + 挂载后置 shown 代替
	let shown = $state(false)

	$effect(() => {
		const timer = setTimeout(() => (shown = true), 50)
		return () => clearTimeout(timer)
	})

	// github.svg 是白色图标（旧站给的是白色 fill），在浅色卡片上会看不见，这里改成跟随文字色
	const githubIcon = $derived(githubSvg.replace(/fill="white"/g, 'fill="currentColor"'))
</script>

<svelte:head>
	<title>{data.title} | SelfWeb</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div class="flex w-full flex-col items-center py-8 sm:py-12">
	<div class="w-full max-w-[800px]">
		<div class="card-anim mb-10 text-center" data-shown={shown}>
			<h1 class="mb-4 text-3xl font-bold sm:text-4xl">{data.title}</h1>
			<p class="text-secondary text-lg">{data.description}</p>
		</div>

		<!-- card utility 自带 absolute（首页卡片用），补 relative! 让它回到文档流 -->
		<div class="card card-anim relative! p-6" data-shown={shown}>
			<div class="prose max-w-none">{@html data.html}</div>
		</div>

		<div class="card-anim mt-8 flex items-center justify-center gap-6" data-shown={shown}>
			<a
				href="https://github.com/YYsuni/2025-blog-public"
				target="_blank"
				rel="noreferrer"
				title="站点源码"
				class="bg-card text-primary flex h-[53px] w-[53px] items-center justify-center rounded-full border transition-transform hover:scale-105"
			>
				<span class="block h-6 w-6 [&>svg]:h-full [&>svg]:w-full">{@html githubIcon}</span>
			</a>

			<!-- 与旧站同一个 slug（旧站的 BLOG_SLUG_KEY 默认为空串） -->
			<LikeButton slug="etk3mfalive-open-source" delay={0} />
		</div>
	</div>
</div>
