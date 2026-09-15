<script lang="ts">
	/**
	 * 鸣潮 · 抽卡记录分析（移植自旧站 src/app/wuthering-waves/page.tsx，162 行）
	 *
	 * 迁移要点：
	 * - 纯本地文本解析，无任何网络请求；解析函数原样搬过来
	 * - useState/useCallback → Svelte 5 $state + 普通函数（onclick）
	 * - React 的 style={{ width }} → Svelte 的 style="width: {…}px"
	 */
	interface CardRecord {
		cardPoolType: string
		resourceId: number
		qualityLevel: number
		resourceType: string
		name: string
		count: number
		time: string
	}

	type PitySegment = {
		pulls: number
		name: string | null
		time: string | null
	}

	function parseCardRecords(raw: string): CardRecord[] {
		const data = JSON.parse(raw) as unknown
		if (!Array.isArray(data)) {
			throw new Error('根节点必须是数组')
		}
		return data.map((item, i) => {
			if (typeof item !== 'object' || item === null) {
				throw new Error(`第 ${i + 1} 项不是对象`)
			}
			const r = item as Record<string, unknown>
			const qualityLevel = Number(r.qualityLevel)
			if (!Number.isFinite(qualityLevel)) {
				throw new Error(`第 ${i + 1} 项缺少有效的 qualityLevel`)
			}
			return {
				cardPoolType: String(r.cardPoolType ?? ''),
				resourceId: Number(r.resourceId ?? 0),
				qualityLevel,
				resourceType: String(r.resourceType ?? ''),
				name: String(r.name ?? ''),
				count: Number(r.count ?? 1),
				time: String(r.time ?? '')
			}
		})
	}

	/** 按数组顺序累计；遇到 5 星则结束当前段并新开计数。未完成段无 name。 */
	function buildPitySegments(records: CardRecord[]): PitySegment[] {
		const segments: PitySegment[] = []
		let pulls = 0
		let name: string | null = null
		let time: string | null = null

		for (const rec of records) {
			pulls++
			if (rec.qualityLevel === 5) {
				segments.push({ pulls, name, time })
				pulls = 1
				name = rec.name
				time = rec.time
			}
		}

		if (pulls > 0) {
			segments.push({ pulls, name, time })
		}

		return segments
	}

	// 旧站是写在 JSX 里的字符串字面量；Svelte 属性值里的 `{` 会被当成表达式，所以提出来
	const PLACEHOLDER = '[{"cardPoolType":"…","qualityLevel":4,"name":"…",...}, ...]'

	let input = $state('')
	let error = $state<string | null>(null)
	let segments = $state<PitySegment[]>([])

	function analyze() {
		error = null
		const trimmed = input.trim()
		if (!trimmed) {
			segments = []
			return
		}
		try {
			const records = parseCardRecords(trimmed)
			segments = buildPitySegments(records)
		} catch (e) {
			segments = []
			error = e instanceof Error ? e.message : '解析失败'
		}
	}
</script>

<svelte:head>
	<title>鸣潮 · 抽卡记录分析 | SelfWeb</title>
	<meta name="description" content="粘贴鸣潮抽卡记录 JSON，本地按保底规则分段统计，不上传任何数据。" />
</svelte:head>

<div class="mx-auto max-w-3xl space-y-4 px-4 py-24">
	<h1 class="text-xl font-semibold tracking-tight">鸣潮 · 抽卡记录分析</h1>
	<p class="text-sm">
		<span>使用方法：</span>
	</p>
	<ul class="text-secondary list-inside list-disc text-sm">
		<li>
			进入
			<a href="https://mc.kurogames.com/cloud/#/tools" target="_blank" rel="noreferrer" class="text-brand hover:underline">
				https://mc.kurogames.com/cloud/#/tools
			</a>
			，登录账号。
		</li>
		<li>
			点击 <span class="text-brand">F12</span>，点击右侧 <span class="text-brand">Network</span> 面板。左侧选择<span class="text-brand">换取记录</span>
			，右侧观察出现最新的 <span class="text-brand">query</span> 请求。
		</li>
		<li>
			点击 <span class="text-brand">query</span> 请求，点击 <span class="text-brand">Preview</span> 面板，右键 <span class="text-brand">data</span> 值
			<span class="text-brand">Copy Value</span>。
		</li>
		<li>最后粘贴到下方输入框 - 分析。</li>
	</ul>

	<textarea
		value={input}
		oninput={e => (input = e.currentTarget.value)}
		rows={5}
		spellcheck="false"
		class="bg-card text-foreground focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
		style="max-height: 7.5rem"
		placeholder={PLACEHOLDER}
	></textarea>

	<button type="button" onclick={analyze} class="bg-brand rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90">
		分析
	</button>

	{#if error}
		<p class="text-destructive text-sm" role="alert">
			{error}
		</p>
	{/if}

	{#if segments.length > 0}
		<ul class="space-y-2">
			{#each segments as seg, i (i)}
				<li class="group flex items-center gap-3">
					<div
						class="bg-brand-secondary flex h-7 shrink-0 items-center overflow-hidden rounded-sm pl-2 text-xs leading-none font-bold text-white tabular-nums"
						style="width: {seg.pulls * 4 + 16}px"
						title={`${seg.pulls} 抽`}>
						{seg.pulls}
					</div>
					<span class="text-foreground min-w-0 flex-1 truncate text-sm">
						{#if seg.name}
							<span>
								{seg.name} <span class="text-secondary hidden text-xs group-hover:inline">({seg.time?.slice(0, 10)})</span>
							</span>
						{:else}
							<span class="text-secondary">（未到 5 星）</span>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
