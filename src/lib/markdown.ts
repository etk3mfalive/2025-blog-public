import { marked } from 'marked'
import type { Tokens } from 'marked'

/**
 * 构建期 Markdown 渲染（从 Next 版 src/lib/markdown-renderer.ts 移植）
 *
 * 与浏览器版的关键差别：这里一次性产出最终 HTML，不需要“占位符 → 再解析”的把戏；
 * 代码高亮（shiki）在 lex 之后、parse 之前完成，因此 renderer 仍是同步的。
 */

export type TocItem = { id: string; text: string; level: number }

export type MarkdownRenderResult = { html: string; toc: TocItem[] }

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

let shikiModule: typeof import('shiki') | null = null
let shikiTried = false

async function loadShiki() {
	if (shikiTried) return shikiModule
	shikiTried = true
	try {
		shikiModule = await import('shiki')
	} catch (error) {
		console.warn('[markdown] shiki 加载失败，代码块将不高亮：', error)
		shikiModule = null
	}
	return shikiModule
}

let katexModule: any = null
let katexTried = false

async function loadKatex() {
	if (katexModule) return katexModule
	if (katexTried) return null
	katexTried = true
	try {
		const mod: any = await import('katex')
		katexModule = mod?.default ?? mod
	} catch (error) {
		console.warn('[markdown] katex 加载失败，公式将保留原文：', error)
		katexModule = null
	}
	return katexModule
}

function renderCodeBlock(highlighted: string, original: string, title?: string): string {
	const codeAttr = escapeAttr(original)
	const titleAttr = title ? ` data-title="${escapeAttr(title)}"` : ''
	const body = highlighted || `<pre class="shiki"><code>${original.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`

	// 类名与旧站 article.css 保持一致（code-block-wrapper / code-block-collapsible / code-block-header …）
	if (!title) {
		return `<div class="code-block-wrapper" data-code="${codeAttr}"><button type="button" class="code-block-copy-btn" data-code-copy aria-label="复制代码">⧉</button>${body}</div>`
	}

	return `<div class="code-block-wrapper code-block-collapsible" data-code="${codeAttr}"${titleAttr}><div class="code-block-header"><button type="button" class="code-block-toggle-btn" data-code-toggle aria-label="折叠/展开代码" aria-expanded="true">▾</button><span class="code-block-title">${title}</span><button type="button" class="code-block-copy-btn code-block-copy-btn-header" data-code-copy aria-label="复制代码">⧉</button></div><div class="code-block-body">${body}</div></div>`
}

export async function renderMarkdown(markdown: string): Promise<MarkdownRenderResult> {
	const codeBlockMap = new Map<string, { html: string; original: string; title?: string }>()
	const [shiki, katex] = await Promise.all([loadShiki(), loadKatex()])

	const renderer = new marked.Renderer()

	renderer.heading = (token: Tokens.Heading) => {
		// 标题前的 “#” 由 article.css 的 ::before 提供，这里只补 id 供 TOC 锚点使用
		const id = slugify(token.text || '')
		return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>\n`
	}

	renderer.code = (token: Tokens.Code) => {
		const codeData = codeBlockMap.get(token.text)
		if (codeData) return renderCodeBlock(codeData.html, codeData.original, codeData.title)
		return `<pre class="shiki"><code>${token.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
	}

	renderer.listitem = (token: Tokens.ListItem) => {
		let tokens = token.tokens
		if (token.task) tokens = tokens.slice(1)
		const inner = marked.parser(tokens) as string
		if (token.task) {
			const checkbox = token.checked ? '<input type="checkbox" checked disabled />' : '<input type="checkbox" disabled />'
			return `<li class="task-list-item">${checkbox} ${inner}</li>\n`
		}
		return `<li>${inner}</li>\n`
	}

	const renderMath = (content: string, displayMode: boolean) => {
		if (!katex) return displayMode ? `$$${content}$$` : `$${content}$`
		try {
			return katex.renderToString(content, { displayMode, throwOnError: false, output: 'html', strict: 'ignore' })
		} catch {
			return displayMode ? `$$${content}$$` : `$${content}$`
		}
	}

	marked.use({
		renderer,
		extensions: [
			{
				name: 'mathBlock',
				level: 'block',
				start(src: string) {
					return src.indexOf('$$')
				},
				tokenizer(src: string) {
					const match = src.match(/^\$\$([\s\S]+?)\$\$(?:\n+|$)/)
					if (!match) return
					return { type: 'mathBlock', raw: match[0], text: match[1].trim() } as any
				},
				renderer(token: any) {
					return `${renderMath(token.text || '', true)}\n`
				}
			},
			{
				name: 'mathInline',
				level: 'inline',
				start(src: string) {
					const idx = src.indexOf('$')
					return idx === -1 ? undefined : idx
				},
				tokenizer(src: string) {
					if (src.startsWith('$$')) return
					if (src.startsWith('\\$')) return
					const match = src.match(/^\$([^\n$]+?)\$/)
					if (!match) return
					const inner = match[1]
					if (!inner || !inner.trim()) return
					return { type: 'mathInline', raw: match[0], text: inner.trim() } as any
				},
				renderer(token: any) {
					return renderMath(token.text || '', false)
				}
			}
		]
	})

	const tokens = marked.lexer(markdown)

	// TOC（在代码块被替换前提取，避免把代码里的 # 当标题）
	const toc: TocItem[] = []
	function extractHeadings(tokenList: typeof tokens) {
		for (const token of tokenList) {
			if (token.type === 'heading' && (token as Tokens.Heading).depth <= 3) {
				const heading = token as Tokens.Heading
				toc.push({ id: slugify(heading.text), text: heading.text, level: heading.depth })
			}
			if ('tokens' in token && token.tokens) extractHeadings(token.tokens as typeof tokens)
		}
	}
	extractHeadings(tokens)

	// 代码高亮：替换 token.text 为 map key，renderer 里同步取回
	for (const token of tokens) {
		if (token.type !== 'code') continue
		const codeToken = token as Tokens.Code
		const originalCode = codeToken.text
		const key = `__SHIKI_CODE_${codeBlockMap.size}__`

		let lang = codeToken.lang || 'text'
		let title: string | undefined
		const titleMatch = lang.match(/^(.*?)\s+title=["'](.+?)["']$/)
		if (titleMatch) {
			lang = titleMatch[1].trim() || 'text'
			title = titleMatch[2]
		}

		let html = ''
		if (shiki) {
			try {
				html = await shiki.codeToHtml(originalCode, { lang, theme: 'one-light' })
			} catch {
				html = ''
			}
		}
		codeBlockMap.set(key, { html, original: originalCode, title })
		codeToken.text = key
	}

	const html = (marked.parser(tokens) as string) || ''
	return { html, toc }
}
