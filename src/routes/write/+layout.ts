/**
 * 写作控制台的布局配置（浏览器专属）
 *
 * - `prerender = true`：纯静态导出必须能预渲染出这个页面（否则 adapter-static 直接构建失败）。
 * - `ssr = false`：页面只在浏览器渲染。认证层要碰 sessionStorage / crypto.subtle / File 读取，
 *   在服务端渲染会直接抛错；关掉 SSR 后这些代码只在水合后的客户端运行。
 *
 * 因此 /write 被预渲染成一个空壳 HTML，界面完全由客户端接管；编辑模式不走动态路由，
 * 用 /write?slug=<slug> 查询参数区分（动态路由在纯静态导出下会缺 entries）。
 */
export const prerender = true
export const ssr = false
