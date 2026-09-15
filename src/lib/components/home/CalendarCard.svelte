<script lang="ts">
	import dayjs from 'dayjs'
	import { onMount } from 'svelte'
	import Card from '$lib/components/Card.svelte'
	import { cardStyles, siteContent } from '$lib/config/site'
	import { CARD_SPACING, cn } from '$lib/utils'

	/**
	 * 月历卡片（移植自旧站 src/app/(home)/calendar-card.tsx）
	 *
	 * 迁移差异：
	 * - 不再引入 dayjs/locale/zh-cn（避免全局 locale 副作用），星期几用本地数组输出「周一…周日」；
	 * - 去掉 HomeDraggableLayer，直接渲染 <Card>，位置公式照抄旧文件；
	 * - SSR/水合：本站是构建期预渲染的，HTML 里烘焙的是「构建当天」的日期。
	 *   客户端首次水合若直接用 new Date()，隔天访问必然与 HTML 不一致（hydration mismatch），
	 *   所以把构建期日期同时写进 <ul data-calendar-date>，客户端初始化时回读这一份值 ——
	 *   首次渲染与 HTML 完全相同；onMount 之后再切到客户端真实「今天」。
	 */

	const styles = cardStyles.calendarCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	// JSON 里 offsetX/offsetY 默认是 null，显式收窄类型方便做 !== null 判断
	const offsetX = styles.offsetX as number | null
	const offsetY = styles.offsetY as number | null

	const ox = offsetX !== null ? offsetX : CARD_SPACING + hiCardStyles.width / 2
	const oy = offsetY !== null ? offsetY : -clockCardStyles.offset + CARD_SPACING

	/** 服务端把「构建当天」写在这个属性上，客户端水合时回读（见文件头说明） */
	const DAY_ATTR = 'data-calendar-date'
	/** 旧站是 dayjs zh-cn 的 ddd，这里用等价的中文星期（周一开头） */
	const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
	/** 旧站的 dates 常量：表头一…日 */
	const COLUMNS = ['一', '二', '三', '四', '五', '六', '日']

	function toDayKey(date: Date): string {
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		return `${date.getFullYear()}-${month}-${day}`
	}

	/** 构建期（SSR 时是本模块在服务端求值的那一刻）的日期 */
	const BUILD_DAY_KEY = toDayKey(new Date())

	function initialDayKey(): string {
		if (typeof document !== 'undefined') {
			const fromDom = document.querySelector(`[${DAY_ATTR}]`)?.getAttribute(DAY_ATTR)
			if (fromDom && /^\d{4}-\d{2}-\d{2}$/.test(fromDom)) return fromDom
		}
		return BUILD_DAY_KEY
	}

	let dayKey = $state(initialDayKey())

	// 水合完成后再按客户端日期刷新（跨天/跨时区访问时修正）
	onMount(() => {
		dayKey = toDayKey(new Date())
	})

	const now = $derived(dayjs(dayKey))
	const currentDate = $derived(now.date())
	const firstDayWeekday = $derived((now.startOf('month').day() + 6) % 7)
	const daysInMonth = $derived(now.daysInMonth())
	const currentWeekday = $derived((now.day() + 6) % 7)

	const range = (length: number) => Array.from({ length }, (_, index) => index)
</script>

<Card order={styles.order} width={styles.width} height={styles.height} {ox} {oy} class="flex flex-col">
	{#if siteContent.enableChristmas}
		<img
			src="/images/christmas/snow-7.webp"
			alt="Christmas decoration"
			class="pointer-events-none absolute"
			style="width:150px;right:-12px;top:-12px;opacity:0.8" />
	{/if}

	<h3 class="text-secondary text-sm">{now.format('YYYY/M/D')} {WEEKDAYS[currentWeekday]}</h3>

	<ul
		data-calendar-date={dayKey}
		class={cn(
			'text-secondary mt-3 grid h-[206px] flex-1 grid-cols-7 gap-2 text-sm',
			(styles.height < 240 || styles.width < 240) && 'text-xs'
		)}>
		{#each COLUMNS as label, index (label)}
			<li class={cn('flex items-center justify-center font-medium', index === currentWeekday && 'text-brand')}>{label}</li>
		{/each}

		{#each range(firstDayWeekday) as empty (`empty-${empty}`)}
			<li></li>
		{/each}

		{#each range(daysInMonth) as index (index)}
			{@const day = index + 1}
			<li class={cn('flex items-center justify-center rounded-lg', day === currentDate && 'bg-linear border font-medium')}>{day}</li>
		{/each}
	</ul>
</Card>
