<script lang="ts">
	import { viewport } from '$lib/viewport.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { ANIMATION_DELAY, CARD_SPACING } from '$lib/utils'

	import githubSvg from '$lib/svgs/github.svg?raw'
	import juejinSvg from '$lib/svgs/juejin.svg?raw'
	import emailSvg from '$lib/svgs/email.svg?raw'
	import xSvg from '$lib/svgs/x.svg?raw'
	import tgSvg from '$lib/svgs/tg.svg?raw'
	import wechatSvg from '$lib/svgs/wechat.svg?raw'
	import facebookSvg from '$lib/svgs/facebook.svg?raw'
	import tiktokSvg from '$lib/svgs/tiktok.svg?raw'
	import instagramSvg from '$lib/svgs/instagram.svg?raw'
	import weiboSvg from '$lib/svgs/weibo.svg?raw'
	import xiaohongshuSvg from '$lib/svgs/小红书.svg?raw'
	import zhihuSvg from '$lib/svgs/知乎.svg?raw'
	import bilibiliSvg from '$lib/svgs/哔哩哔哩.svg?raw'
	import qqSvg from '$lib/svgs/qq.svg?raw'

	/**
	 * 首页社交按钮行（移植自旧站 src/app/(home)/social-buttons.tsx）
	 *
	 * 迁移差异：
	 * - lucide/motion/react → SVG ?raw + {@html} + CSS 过渡（.card-anim / .card-hover 提供缩放反馈）；
	 * - sonner toast 去掉（复制后的提示不再弹 toast，交互保留）；
	 * - QR 弹层不再用 createPortal + fixed 定位，改为按钮旁 absolute 定位（少一次 getBoundingClientRect，
	 *   也不受卡片 backdrop-filter 影响），同时去掉点外部关闭的 document 监听。
	 */
	type SocialButtonType =
		| 'github'
		| 'juejin'
		| 'email'
		| 'link'
		| 'x'
		| 'tg'
		| 'wechat'
		| 'facebook'
		| 'tiktok'
		| 'instagram'
		| 'weibo'
		| 'xiaohongshu'
		| 'zhihu'
		| 'bilibili'
		| 'qq'

	type SocialButtonConfig = {
		id: string
		type: SocialButtonType
		value: string
		label?: string
		order: number
	}

	const styles = cardStyles.socialButtons
	const hiCardStyles = cardStyles.hiCard

	const isCompact = $derived(viewport.maxSM && viewport.init)
	const order = $derived(isCompact ? 0 : styles.order)
	const delay = $derived(isCompact ? 0 : 100)

	const buttons = $derived(
		[...((siteContent.socialButtons ?? []) as unknown as SocialButtonConfig[])].sort((a, b) => a.order - b.order)
	)

	/** 旧的 iconMap：type → 图标 SVG 源码 */
	const iconMap: Record<SocialButtonType, string> = {
		github: githubSvg,
		juejin: juejinSvg,
		email: emailSvg,
		wechat: wechatSvg,
		x: xSvg,
		tg: tgSvg,
		facebook: facebookSvg,
		tiktok: tiktokSvg,
		instagram: instagramSvg,
		weibo: weiboSvg,
		xiaohongshu: xiaohongshuSvg,
		zhihu: zhihuSvg,
		bilibili: bilibiliSvg,
		qq: qqSvg,
		link: ''
	}

	// 初始即为可见：这样预渲染 HTML 里就带上了社交链接（旧的 setTimeout 逐个显示会让
	// 无 JS 环境/爬虫看不到任何按钮）。依次入场改由 CSS animation-delay 完成。
	const shown = $derived<Record<string, boolean>>({
		container: true,
		...Object.fromEntries(buttons.map(button => [button.id, true]))
	})
	let openDropdowns = $state<Record<string, boolean>>({})

	const containerShown = $derived(shown.container === true)

	const ox = styles.offsetX !== null ? styles.offsetX : hiCardStyles.width / 2 - styles.width
	const oy = styles.offsetY !== null ? styles.offsetY : hiCardStyles.height / 2 + CARD_SPACING

	function toggleDropdown(id: string) {
		openDropdowns = { ...openDropdowns, [id]: !openDropdowns[id] }
	}

	function copyText(type: 'email' | 'wechat' | 'qq', value: string) {
		const messageMap: Record<'email' | 'wechat' | 'qq', string> = {
			email: '邮箱已复制到剪贴板',
			wechat: '微信号已复制到剪贴板',
			qq: 'QQ号已复制到剪贴板'
		}
		// 旧站用 sonner toast 提示，这里去掉 toast，只保留复制行为与文案常量
		void messageMap[type]
		navigator.clipboard?.writeText(value)
	}
</script>

{#if containerShown}
	<div class="absolute max-sm:static" style="left:calc(50% + {ox}px);top:calc(50% - 24px + {oy}px)">
		<div class="absolute top-0 left-0 flex flex-row-reverse items-center gap-3 max-sm:static" style="width:{styles.width}px">
			{#each buttons as button, index (button.id)}
				{#if shown[button.id]}
					{@const hasLabel = Boolean(button.label)}
					{@const iconClass = hasLabel ? 'size-6' : 'size-8'}
					{@const icon = iconMap[button.type]}

					{#if button.type === 'github'}
						<a
							href={button.value}
							target="_blank"
							rel="noreferrer"
							class="font-averia card-anim card-hover flex items-center gap-2 rounded-xl border bg-[#070707] text-xl text-white {!hasLabel
								? 'p-1.5'
								: 'px-3 py-1.5'}"
							style="box-shadow:inset 0 0 12px rgba(255, 255, 255, 0.4);animation-delay:{order * ANIMATION_DELAY * 1000 + index * delay}ms"
						>
							<span class="inline-flex size-8 shrink-0 items-center justify-center [&>svg]:size-full">
								{@html icon}
							</span>
							{#if hasLabel}{button.label}{/if}
						</a>
					{:else if button.type === 'email' || button.type === 'wechat' || button.type === 'qq'}
						{#if button.value.startsWith('/images/social-buttons/') && (button.type === 'wechat' || button.type === 'qq')}
							<div class="relative">
								<button
									type="button"
									onclick={() => toggleDropdown(button.id)}
									class="card card-anim card-hover relative rounded-xl p-1.5"
								>
									<span class="inline-flex size-8 shrink-0 items-center justify-center [&>svg]:size-full">
										{@html icon}
									</span>
								</button>
								{#if openDropdowns[button.id]}
									<div
										class="bg-card absolute top-full left-0 z-50 mt-2 rounded-2xl border p-4 backdrop-blur-xl"
										style="box-shadow:0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
									>
										<img src={button.value} alt="QR Code" class="h-48 w-48 rounded-lg object-cover" />
									</div>
								{/if}
							</div>
						{:else}
							<button
								type="button"
								onclick={() => copyText(button.type as 'email' | 'wechat' | 'qq', button.value)}
								class="card card-anim card-hover relative rounded-xl p-1.5"
							>
								<span class="inline-flex size-8 shrink-0 items-center justify-center [&>svg]:size-full">
									{@html icon}
								</span>
							</button>
						{/if}
					{:else if button.type === 'link'}
						<a
							href={button.value}
							target="_blank"
							rel="noreferrer"
							class="card card-anim card-hover relative flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium whitespace-nowrap"
						>
							{hasLabel ? button.label : button.value}
						</a>
					{:else}
						<a
							href={button.value}
							target="_blank"
							rel="noreferrer"
							class="card card-anim card-hover relative rounded-xl font-medium whitespace-nowrap {hasLabel
								? 'flex items-center gap-2 px-3 py-2.5'
								: 'p-1.5'}"
						>
							<span class="inline-flex {iconClass} shrink-0 items-center justify-center [&>svg]:size-full">
								{@html icon}
							</span>
							{#if hasLabel}{button.label}{/if}
						</a>
					{/if}
				{/if}
			{/each}
		</div>
	</div>
{/if}
