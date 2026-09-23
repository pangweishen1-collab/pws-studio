# PWS STUDIO

设计师资源库：公司 Skill、设计 Skill、提效工具、宝藏网站与经验沉淀。

## 本地运行

需要 Node.js 22.13+ 和 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm dev --port 3016
```

网站运行于 Vinext + React + Cloudflare Workers，Skill 元数据、Markdown、ZIP 文件及计数保存在 R2。
本地 `.dev.vars` 可配置 `SKILL_UPLOAD_KEY`，该发布密钥不得提交到 Git。

## 检查与构建

```sh
pnpm check:images
pnpm exec tsc --noEmit
pnpm build
```

展示图片统一使用压缩 WebP；规则见 AGENTS.md。

## 发布说明

GitHub 仓库保存网站源码和展示资源。GitHub Pages 仅支持静态网站，不能直接运行本项目的上传、下载计数和 R2 接口。
线上运行需要 Workers 兼容环境及 `SKILLS_BUCKET` R2 绑定。`.openai/hosting.json` 记录现有 Sites 项目配置。

本地 R2 数据、上传的 Skill 文件包、密钥与运行缓存不会随源码提交；迁移环境需单独迁移存储数据。

## 当前线上网站

https://pws-studio.pangweishen1.workers.dev

部署到现有 Cloudflare 账户：

```sh
pnpm build
node scripts/deploy-cloudflare.mjs
```

Worker 名称为 `pws-studio`，R2 存储桶为 `pws-studio-skills`，绑定为 `SKILLS_BUCKET`。
上传密钥通过 Cloudflare Worker Secret 配置，不写入源码。

## 自动检测报告

每个 Skill 版本独立保存五维静态检测报告。上传时生成，历史版本首次访问 `/api/skills/<slug>/evaluation?version=<version>` 时补建；同一规则版本复用 R2 报告，避免重复解包。

检查包括 ZIP 路径与大小、Markdown 相对链接、入口结构、敏感操作和疑似凭证模式。引擎不会执行下载包中的代码。环境说明与实际效果分开标注，不将关键词或通过项数量换算为质量分。

```sh
node --experimental-strip-types --test tests/skill-auto-check.test.mjs
```

修改检测规则时提升 `ENGINE_VERSION`，使已有 Skill 生成新规则版本的报告。
