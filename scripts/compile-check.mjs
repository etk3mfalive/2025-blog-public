#!/usr/bin/env node
/**
 * 用 svelte/compiler 预检所有 .svelte 文件（比整站 vite build 快很多，适合改完随手跑）
 * 用法：node scripts/compile-check.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from 'svelte/compiler'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

function walk(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) out.push(...walk(full))
		else if (entry.name.endsWith('.svelte')) out.push(full)
	}
	return out
}

const files = walk(root)
let ok = 0
const problems = []

for (const file of files) {
	const rel = file.slice(root.length + 1)
	try {
		const source = fs.readFileSync(file, 'utf8')
		// Svelte 5 编译器原生支持 <script lang="ts">，无需预处理器（也避开了沙箱下加载 vite 配置的限制）
		const result = compile(source, {
			filename: file,
			generate: 'client',
			runes: true,
			warningFilter: warning => !warning.code.startsWith('a11y_')
		})
		ok++
		if (result.warnings.length) {
			problems.push({ rel, type: 'warning', msgs: result.warnings.map(w => `${w.code}: ${w.message}`) })
		}
	} catch (error) {
		problems.push({ rel, type: 'error', msgs: [error.message] })
	}
}

console.log(`[compile-check] ${ok}/${files.length} 个组件编译通过`)
for (const problem of problems) {
	console.log(`\n${problem.type === 'error' ? '❌' : '⚠️'} ${problem.rel}`)
	for (const message of problem.msgs.slice(0, 6)) console.log('   ' + message.replace(/\n/g, ' ').slice(0, 300))
}

if (problems.some(p => p.type === 'error')) process.exit(1)
