<script lang="ts">
	/**
	 * 私钥面板：GitHub App 私钥 → installation token 的入口
	 *
	 * 与旧站的区别：旧站的"记住私钥"是用打包进客户端的公开常量做 AES-GCM（等于混淆），
	 * 这里改成用户口令 + PBKDF2 派生密钥把私钥加密后放进 sessionStorage，口令不落盘。
	 */
	import { onMount } from 'svelte'
	import { githubAuth, readPrivateKeyFile } from '$lib/github/auth.svelte'
	import { GITHUB } from '$lib/github/config'

	let file = $state<File | null>(null)
	let passphrase = $state('')
	let remember = $state(false)
	let busy = $state(false)
	let localError = $state<string | null>(null)
	let fileInput: HTMLInputElement | null = null

	const configured = $derived(githubAuth.configured)
	const missing = $derived(
		[
			GITHUB.owner ? '' : 'PUBLIC_GITHUB_OWNER',
			GITHUB.repo ? '' : 'PUBLIC_GITHUB_REPO',
			GITHUB.appId ? '' : 'PUBLIC_GITHUB_APP_ID'
		].filter(Boolean)
	)

	onMount(() => {
		githubAuth.init()
	})

	async function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement
		const picked = input.files?.[0] ?? null
		file = picked
		localError = null
		if (input) input.value = ''
		if (picked) await applyKey(picked)
	}

	async function applyKey(picked: File) {
		busy = true
		localError = null
		try {
			const pem = await readPrivateKeyFile(picked)
			if (remember && !passphrase.trim()) {
				localError = '勾选了「记住到本次会话」就必须填一个口令（用于加密私钥）。'
				return
			}
			await githubAuth.setPrivateKey(pem, remember ? passphrase.trim() : undefined)
		} catch (error) {
			localError = error instanceof Error ? error.message : String(error)
		} finally {
			busy = false
		}
	}

	async function unlock() {
		if (!passphrase.trim()) {
			localError = '请输入当时设置的口令。'
			return
		}
		busy = true
		localError = null
		try {
			const ok = await githubAuth.unlock(passphrase.trim())
			if (ok) passphrase = ''
		} catch (error) {
			localError = error instanceof Error ? error.message : String(error)
		} finally {
			busy = false
		}
	}

	function forget() {
		githubAuth.forget()
		file = null
		passphrase = ''
		remember = false
		localError = null
	}

	const stateText = $derived(
		githubAuth.tokenReady ? '已就绪（installation token 已签发）' : githubAuth.hasKey ? '已载入私钥（首次发布时签发令牌）' : '未提供私钥'
	)
</script>

<section class="card card-rounded relative w-full">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-sm font-medium">GitHub 认证</h2>
			<p class="text-secondary mt-1 text-xs">{stateText}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<span class="rounded-full border border-white/60 bg-white/60 px-2 py-0.5">{GITHUB.owner}/{GITHUB.repo}</span>
			{#if githubAuth.tokenReady}
				<button type="button" class="card-rounded border bg-white/70 px-3 py-1.5" onclick={() => githubAuth.clearToken()}>清除令牌</button>
			{/if}
			{#if githubAuth.hasKey || githubAuth.remembered}
				<button type="button" class="card-rounded border bg-white/70 px-3 py-1.5" onclick={forget}>忘记私钥</button>
			{/if}
		</div>
	</div>

	{#if !configured}
		<div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800" role="alert">
			<p class="font-medium">缺少 GitHub App 配置，写作功能不可用。</p>
			<p class="mt-1">
				需要在环境变量里提供 {missing.join('、')}（可选 PUBLIC_GITHUB_BRANCH / PUBLIC_CONTENT_DIR），然后重新构建站点。
			</p>
		</div>
	{/if}

	{#if githubAuth.remembered && !githubAuth.hasKey}
		<div class="mt-4 rounded-xl border bg-white/60 p-3">
			<p class="text-xs">本次会话里存着一把加密私钥，输入口令解锁后即可发布。</p>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<input
					type="password"
					bind:value={passphrase}
					placeholder="口令"
					autocomplete="current-password"
					class="card-rounded min-w-[10rem] flex-1 border bg-white/70 px-3 py-2 text-sm"
				/>
				<button type="button" class="brand-btn" disabled={busy} onclick={unlock}>{busy ? '解锁中…' : '解锁'}</button>
			</div>
			<button type="button" class="card-rounded mt-2 border bg-white/70 px-3 py-1.5 text-xs" disabled={busy} onclick={() => fileInput?.click()}>
				改用其它私钥文件
			</button>
		</div>
	{:else if !githubAuth.hasKey}
		<div class="mt-4 space-y-3">
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="brand-btn" disabled={busy || !configured} onclick={() => fileInput?.click()}>
					{busy ? '读取中…' : '选择私钥文件'}
				</button>
				<span class="text-secondary text-xs">{file ? file.name : '需 GitHub App 的 .pem 私钥（只在本页面内存里使用）'}</span>
			</div>

			<label class="flex items-center gap-2 text-xs select-none">
				<input type="checkbox" bind:checked={remember} class="h-4 w-4 rounded border-gray-300" />
				记住到本次会话（需口令）
			</label>
			{#if remember}
				<div>
					<input
						type="password"
						bind:value={passphrase}
						placeholder="设置一个口令，用于加密后存入 sessionStorage"
						autocomplete="new-password"
						class="card-rounded w-full border bg-white/70 px-3 py-2 text-sm"
					/>
					<p class="text-secondary mt-1 text-[11px] leading-relaxed">
						口令只用于本地 PBKDF2 派生密钥，不会上传；加密私钥存在 sessionStorage，直到「忘记私钥」或关闭浏览器。
					</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
			<span class="rounded-full border border-white/60 bg-white/60 px-3 py-1.5">私钥已在内存中，可以发布</span>
			<button type="button" class="card-rounded border bg-white/70 px-3 py-1.5" onclick={() => fileInput?.click()}>换一个私钥</button>
		</div>
	{/if}

	<input bind:this={fileInput} type="file" accept=".pem" class="hidden" onchange={handleFile} />

	{#if githubAuth.progress}
		<p class="text-secondary mt-3 text-xs">{githubAuth.progress}</p>
	{/if}
	{#if localError || githubAuth.error}
		<p class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{localError || githubAuth.error}</p>
	{/if}
</section>
