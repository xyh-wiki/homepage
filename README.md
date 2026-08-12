# xyh.wiki Homepage

xyh.wiki 的正式公共首页，用于集中展示持续维护的在线工具、开发者内容和个人应用入口。

当前生产站点为 `https://xyh.wiki/`。本仓库中的改版需要完成测试、评审和发布后才会反映到线上。

## 已实现

- 数据驱动的项目目录、搜索和分类筛选。
- 每个项目的独立说明页，包括功能、访问方式、语言和使用建议。
- 关于、使用说明、隐私、条款、服务说明和联系页面。
- 完整静态 HTML、独立元数据、canonical、JSON-LD、robots、Sitemap 和真实 404。
- 非公开入口说明页使用 `noindex`，并从 Sitemap 排除。
- 无 npm 第三方依赖的 Node.js 22 构建与测试。
- 非 root Caddy 容器和 Dokploy Compose 模板。
- 静态资源内容哈希版本参数，发布新样式时不会继续命中旧浏览器缓存。

公开页面不会显示内部主机名、端口、部署信息、未启用功能或商业计划。

## 技术栈

- Node.js 22 原生静态生成脚本
- 语义 HTML、CSS 和少量原生 JavaScript
- Node.js 内置测试运行器
- Caddy 2.10.2 非 root 容器
- Dokploy + Traefik 生产入口

公开内容在构建阶段写入 HTML，不依赖客户端渲染。禁用 JavaScript 时仍可阅读全部项目并打开链接。

## 目录

```text
data/catalog.json       分类与访问类型配置
data/services.json      项目清单与公开说明
data/site.json          站点级配置
src/content/            指南和政策正文
src/templates/          页面模板
src/assets/             CSS、JavaScript 和 SVG
scripts/                构建与本地预览
tests/                  构建产物测试
deploy/                 Dokploy Compose 模板
docs/                   规划、业务、技术和运维文档
```

## 本地开发

要求 Node.js 22 或更高版本，不需要安装 npm 依赖。

```bash
cd /data/projects/homepage
npm run build
npm run check
npm run serve
```

浏览 `http://127.0.0.1:4173/`。完整验证：

```bash
npm run test
```

## 添加项目

通常只需编辑 `data/services.json`，构建器会自动完成：

- 首页项目列表和搜索数据；
- 项目详情页；
- JSON-LD；
- Sitemap 收录或排除；
- 项目总数。

每个项目必须包含以下字段：

```json
{
  "slug": "example-tool",
  "name": "Example Tool",
  "url": "https://example.xyh.wiki/",
  "category": "developer",
  "availability": "public",
  "host": "internal-maintenance-value",
  "summary": "一句话说明项目用途。",
  "features": ["能力一", "能力二", "能力三"],
  "keywords": ["搜索词一", "搜索词二"],
  "featured": false,
  "language": "中文",
  "guidance": "使用前需要注意的具体事项。"
}
```

`host` 仅作为内部维护数据保留，构建器不会把它写入公开 HTML。构建时会检查重复名称、重复 URL、重复 slug、未知分类、未知访问类型、字段缺失以及不安全 URL。

新增分类时编辑 `data/catalog.json`；首页筛选按钮和详情页分类名称会自动生成，不需要修改模板。

## 配置

构建变量见 `.env.example`：

- `SITE_URL`：规范站点地址，默认 `https://xyh.wiki`。

不要把密码、Token、Cookie、私钥或其他项目环境文件复制进仓库。

## Docker

```bash
docker build -t xyh-homepage:local .
docker run --rm -p 127.0.0.1:4300:3000 xyh-homepage:local
curl -fsS http://127.0.0.1:4300/healthz
```

生产环境不配置宿主机 published port，由 Dokploy Traefik 通过内部网络访问容器端口 3000。

## SEO

本项目是公开网站，SEO 直接适用。当前实现包括初始 HTML 正文、稳定 URL、唯一元数据、canonical、内部链接、结构化数据、robots、Sitemap、非公开页 `noindex`、真实 404 和移动端布局。

新增服务时，公开项目会自动加入 Sitemap；标记为不可索引的访问类型会自动排除。

## 文档

- [项目规划](docs/PROJECT_PLAN.md)
- [功能规格](docs/FUNCTIONAL_SPEC.md)
- [技术设计](docs/TECHNICAL_DESIGN.md)
- [部署与运维](docs/OPERATIONS.md)

## 使用与许可证

当前为个人正式项目，源码标记为 `UNLICENSED`，未授权对外复制或再发布。若后续公开源码，需要单独选择并补充 LICENSE。
