#!/usr/bin/env node
/**
 * 校验 GitHub App JWT 实现（纯 WebCrypto，无第三方依赖）
 *
 * 三类输入都要能签：
 *   1) PKCS#1 私钥（GitHub App 下载的格式，-----BEGIN RSA PRIVATE KEY-----）
 *   2) PKCS#8 私钥（-----BEGIN PRIVATE KEY-----）
 *   3) 带 \r\n 与末尾换行的 PEM（Windows 下载常见）
 * 并用公钥在 Node 侧独立验签，确认 header/payload 与签名都正确。
 *
 * 用法：node scripts/check-jwt.mjs
 */
import { createVerify, generateKeyPairSync } from 'node:crypto'
import { signAppJwt, decodeJwtPart } from '../src/lib/github/jwt.ts'

const { privateKey: pkcs1Pem, publicKey: spkiPem } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
})

const { privateKey: pkcs8Pem, publicKey: pkcs8PublicPem } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

function verify(jwt, publicKeyPem) {
	const [header, payload, signature] = jwt.split('.')
	const verifier = createVerify('RSA-SHA256')
	verifier.update(`${header}.${payload}`)
	verifier.end()
	const ok = verifier.verify(publicKeyPem, Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
	return {
		ok,
		header: decodeJwtPart(header),
		payload: decodeJwtPart(payload)
	}
}

const cases = [
	['PKCS#1（GitHub App 默认格式）', pkcs1Pem, spkiPem],
	['PKCS#8', pkcs8Pem, pkcs8PublicPem],
	['PKCS#1 + CRLF/末尾换行', pkcs1Pem.replace(/\n/g, '\r\n') + '\r\n', spkiPem]
]

let failed = 0
const appId = '123456'
const now = 1_800_000_000

for (const [label, pem, publicPem] of cases) {
	try {
		const jwt = await signAppJwt(appId, pem, now)
		const { ok, header, payload } = verify(jwt, publicPem)
		const fieldsOk = header.alg === 'RS256' && header.typ === 'JWT' && payload.iss === appId && payload.iat === now - 60 && payload.exp === now + 480
		const pass = ok && fieldsOk
		if (!pass) failed++
		console.log(`${pass ? '✅' : '❌'} ${label} — 验签 ${ok ? '通过' : '失败'}，字段 ${fieldsOk ? '正确' : '异常'}`)
	} catch (error) {
		failed++
		console.log(`❌ ${label} — 抛错：${error.message}`)
	}
}

// 反向用例：篡改签名必须验签失败
const jwt = await signAppJwt(appId, pkcs1Pem, now)
const tampered = jwt.slice(0, -4) + (jwt.endsWith('AAAA') ? 'BBBB' : 'AAAA')
const tamperedOk = verify(tampered, spkiPem).ok
console.log(`${tamperedOk ? '❌' : '✅'} 篡改签名应验签失败（实际 ${tamperedOk ? '通过' : '失败'}）`)
if (tamperedOk) failed++

console.log(failed === 0 ? '\nJWT 实现校验通过 ✅' : `\n有 ${failed} 项失败 ❌`)
process.exit(failed === 0 ? 0 : 1)
