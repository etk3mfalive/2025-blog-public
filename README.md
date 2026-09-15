# SelfWeb（soq.app）

SvelteKit 静态站：全站构建期预渲染，部署在 Vercel，内容以 Git 仓库为唯一数据源，
写作在浏览器里完成（GitHub App 私钥 → installation token → Git Data API 一次提交）。

## 目录结构

```
/                    SvelteKit 应用（本站）
├─ src/
│  ├─ routes/        页面：/、/blog、/blog/[slug]、/about、/share、/bloggers、
│  │                 /pictures、/snippets、/svgs、/clock、/image-toolbox、
│  │                 /live2d、/wuthering-waves、/write（写作控制台）
│  └─ lib/
│     ├─ content.ts  内容层（读 static/blogs，构建期用）
│     ├─ markdown.ts 构建期 Markdown 渲染（marked + shiki + katex）
│     ├─ github/     GitHub 写入层（认证 / JWT / Git Data API）
│     └─ data/       站点配置与列表数据（site-content.json、share.json…）
├─ static/           派生目录：blogs/、data/ 由脚本在构建时生成（不入库）
├─ scripts/          sync-content / build-data / check-content / check-jwt / serve-build
├─ public/           内容与媒体（写作控制台提交到这里）
│  ├─ blogs/<slug>/{index.md,config.json,图片}
│  └─ images/ music/ live2d/
└─ legacy/next-blog/ 旧的 Next.js 应用源码（保留用于对照与回滚，不参与构建）
```

## 本地开发

```bash
pnpm install
pnpm dev            # 同步内容 → 生成静态数据 → 开发服务器（默认 5173）
pnpm build          # 同上两步 + 内容校验 + vite build（输出 build/）
node scripts/serve-build.mjs 4173   # 零依赖静态预览（模拟 Vercel 的 cleanUrls）
pnpm check          # svelte-check（当前 0 error / 0 warning）
pnpm check-jwt      # 校验 GitHub App JWT 实现（PKCS#1/PKCS#8/篡改检测）
```

## 构建流水线

```
public/blogs/**  ──sync-content──▶  static/blogs/**   （文章、图片、config.json）
public/{images,music,live2d}  ──▶  static/{...}
public/blogs/*   ──build-data───▶  static/data/posts.json + static/data/posts/<slug>.json
                                   static/data/about.json
public/blogs/*   ──check-content▶  校验：JSON、必填字段、封面存在、代码围栏成对…
                                   ──vite build──▶ build/（35 个 HTML，全站预渲染）
```

为什么要 `static/data/*.json`：本站是纯静态导出，运行时没有服务器。页面若用服务端 load
（`+page.server.ts`），浏览器端导航会请求 `/xxx/__data.json`，而 adapter-static 不会生成该文件；
若通用 load 直接 import `node:fs` 的内容层，fs 逻辑又会进客户端包。因此内容在构建期编译成
静态 JSON，页面用通用 load `fetch('/data/…')` 读取：预渲染有完整 HTML（SEO），站内跳转也正常。

## 写作控制台

访问 `/write`（新建）或 `/write?slug=<slug>`（编辑/删除）：

1. 选择 GitHub App 私钥 `.pem`（不入库；`*.pem` 已在 .gitignore 中）；
2. 可选"记住到本次会话"——私钥用**你的口令 + PBKDF2(25 万次)** 派生的 AES-GCM 密钥加密后存在 sessionStorage；
3. 发布时一次提交写入 `public/blogs/<slug>/{index.md,config.json,图片}`，新分类会顺带更新 `categories.json`。

需要的环境变量见 `.env.example`：至少要有 `PUBLIC_GITHUB_APP_ID`（以及 owner/repo/branch）。
发布后需等待 Vercel 重新构建，刷新才能看到更新。

## 部署

Vercel 项目根目录就是本仓库根目录，`vercel.json` 已声明：

- `framework: null`、`buildCommand: pnpm build`、`outputDirectory: build`、`cleanUrls: true`
- `_app/immutable/**` 长缓存；`/write` 加 `X-Robots-Tag: noindex` 与 `no-store`

推送到 `main` 即触发部署。

## 回滚

- **构建失败**：Vercel 会继续用上一个成功部署，线上不受影响；
- **回退到旧 Next.js 站**：`git revert` 迁移提交（旧应用在 `legacy/next-blog/`，`public/` 内容未动），
  或把旧应用移回根目录后再推一次。
