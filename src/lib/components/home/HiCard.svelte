<script lang="ts">
	import Card from '$lib/components/Card.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'

	/**
	 * 首页问候卡片（移植自旧站 src/app/(home)/hi-card.tsx）
	 * 旧站用 zustand 读 siteContent / cardStyles，这里改为编译期 import；
	 * 旧站的 HomeDraggableLayer（拖拽编辑）不迁移，Card 直接放在原位。
	 */
	const styles = cardStyles.hiCard

	function getGreeting() {
		const hour = new Date().getHours()

		if (hour >= 6 && hour < 12) {
			return 'Good Morning'
		} else if (hour >= 12 && hour < 18) {
			return 'Good Afternoon'
		} else if (hour >= 18 && hour < 22) {
			return 'Good Evening'
		} else {
			return 'Good Night'
		}
	}

	const greeting = getGreeting()
	const username = siteContent.meta.username || 'Suni'

	// 相对屏幕中心的偏移（Card 用 CSS calc 定位，预渲染即可正确排版，无需 JS）
	const ox = styles.offsetX !== null ? styles.offsetX : -styles.width / 2
	const oy = styles.offsetY !== null ? styles.offsetY : -styles.height / 2
</script>

<Card
	order={styles.order}
	width={styles.width}
	height={styles.height}
	{ox}
	{oy}
	class="relative text-center max-sm:static max-sm:translate-0"
>
	{#if siteContent.enableChristmas}
		<img
			src="/images/christmas/snow-1.webp"
			alt="Christmas decoration"
			class="pointer-events-none absolute"
			style="width:180px;left:-20px;top:-25px;opacity:0.9"
		/>
		<img
			src="/images/christmas/snow-2.webp"
			alt="Christmas decoration"
			class="pointer-events-none absolute"
			style="width:160px;bottom:-12px;right:-8px;opacity:0.9"
		/>
	{/if}

	<a href="/live2d">
		<img
			src="/images/avatar.png"
			alt={username}
			class="mx-auto rounded-full"
			style="width:120px;height:120px;box-shadow:0 16px 32px -5px #E2D9CE"
		/>
	</a>

	<h1 class="font-averia mt-3 text-2xl">
		{greeting} <br /> I'm <span class="text-linear text-[32px]">{username}</span> , Nice to <br /> meet you!
	</h1>
</Card>
