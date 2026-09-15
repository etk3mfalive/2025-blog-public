'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

type CodeBlockProps = {
	children: React.ReactNode
	code: string
	title?: string
}

export function CodeBlock({ children, code, title }: CodeBlockProps) {
	const [copied, setCopied] = useState(false)
	const [collapsed, setCollapsed] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy code:', error)
		}
	}

	// Code blocks without a title render as before (no collapse)
	if (!title) {
		return (
			<div className='code-block-wrapper'>
				<button
					type='button'
					onClick={handleCopy}
					className='code-block-copy-btn'
					aria-label='Copy code'
				>
					{copied ? <Check size={16} /> : <Copy size={16} />}
				</button>
				{children}
			</div>
		)
	}

	// Code blocks with a title get a collapsible header
	return (
		<div className='code-block-wrapper code-block-collapsible'>
			<div className='code-block-header'>
				<button
					type='button'
					className='code-block-toggle-btn'
					onClick={() => setCollapsed(!collapsed)}
					aria-label={collapsed ? 'Expand code' : 'Collapse code'}
				>
					{collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
				</button>
				<span className='code-block-title'>{title}</span>
				<button
					type='button'
					onClick={handleCopy}
					className='code-block-copy-btn code-block-copy-btn-header'
					aria-label='Copy code'
				>
					{copied ? <Check size={14} /> : <Copy size={14} />}
				</button>
			</div>
			{!collapsed && (
				<div className='code-block-body'>
					{children}
				</div>
			)}
		</div>
	)
}

