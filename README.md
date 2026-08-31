# xyh.wiki Homepage

xyh.wiki 的正式公共首页，用于发布围绕浏览器工具、文件处理、文本清理和开源项目评估的原创实践指南。

当前生产站点为 `https://xyh.wiki/`。本仓库中的改版需要完成测试、评审和发布后才会反映到线上。

## 已实现

- 内容优先的实践指南首页和独立文章页。
- 工具参考页，包括功能截图、适用人群、开始步骤、访问方式和使用建议。
- 关于、使用说明、隐私、条款、服务说明和联系页面。
- 完整静态 HTML、独立元数据、canonical、JSON-LD、robots、Sitemap 和真实 404。
- 围绕文件处理、文本清理、开源项目评估和浏览器隐私的原创实践指南。
- 非公开入口说明页使用 `noindex`，并从 Sitemap 排除。
- 无 npm 第三方依赖的 Node.js 22 构建与测试。
- 非 root Caddy 容器和 Dokploy Compose 模板。
- 静态资源内容哈希版本参数，发布新样式时不会继续命中旧浏览器缓存。
- 首页按主题组织指南、编辑原则和阅读前说明，不把项目链接目录作为主要内容。
- 仅在原创实践指南页加载 Google AdSense 脚本；首页、工具参考页和政策页不加载广告脚本，避免在薄内容页面干扰主要任务。
- 根域名生成 `ads.txt`，声明当前 AdSense 发布商授权关系。
- 404 错误页不加载广告脚本，隐私页提供广告个性化设置入口。

公开页面不会显示内部主机名、端口、部署信息或未启用功能。

实践指南页用于提供可独立阅读的原创方法和核对清单；工具参考页只作为文章中的上下文和延伸入口，不进入 Sitemap。

## 技术栈

- Node.js 22 原生静态生成脚本
- 语义 HTML、CSS 和少量原生 JavaScript
- Node.js 内置测试运行器
- Caddy 2.10.2 非 root 容器
- Dokploy + Traefik 生产入口

公开内容在构建阶段写入 HTML，不依赖客户端渲染。禁用 JavaScript 时仍可阅读全部文章和打开外部工具链接。

## 目录

```text
data/catalog.json       分类与访问类型配置
data/services.json      项目清单与公开说明
data/site.json          站点级配置
data/ads.txt             根域名广告授权声明
src/content/            指南和政策正文
src/templates/          页面模板
src/assets/             CSS、JavaScript、SVG 和实际工具截图
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

前端验收还应检查桌面端和 360–430px 移动端的首屏、指南列表、文章截图、导航“更多”菜单、键盘焦点和图片加载。

## 添加文章

新增实践指南时：

1. 在 `scripts/build.mjs` 的 `articles` 配置中增加标题、描述、正文文件、更新时间和（如适用）截图；
2. 在 `src/content/` 增加可以独立阅读的 Markdown 正文；
3. 文章必须说明真实问题、步骤、限制和核对方式，不得只重复工具摘要；
4. 如果引用本站工具，应使用真实外部地址并说明工具关系；
5. 运行 `npm run test`，检查初始 HTML、结构化数据、图片尺寸和 Sitemap。

## 添加工具参考页

通常只需编辑 `data/services.json`，构建器会自动完成：

- 工具参考页；
- JSON-LD；
- `noindex` 页面和截图；
- 文章中的外部参考入口。

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
  "audience": "适合使用该项目的用户和任务。",
  "steps": ["开始操作", "确认设置", "检查并取得结果"],
  "guidance": "使用前需要注意的具体事项。"
}
```

`host` 仅作为内部维护数据保留，构建器不会把它写入公开 HTML。构建时会检查重复名称、重复 URL、重复 slug、未知分类、未知访问类型、字段缺失以及不安全 URL。

分类和访问类型仍由 `data/catalog.json` 维护，用于工具参考页的事实说明；参考页不会自动进入 Sitemap。

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

本项目是公开网站，SEO 直接适用。当前实现包括初始 HTML 正文、稳定 URL、唯一元数据、canonical、内部链接、结构化数据、robots、Sitemap、非公开页 `noindex`、真实 404 和移动端布局。原创实践指南使用独立 URL、文章结构化数据和更新时间，并从首页和使用说明页可达。

实践指南会进入 Sitemap。工具参考页统一使用 `noindex,follow`，不进入 Sitemap；这样可以避免模板化项目页成为主要索引内容。

广告发布商授权文件由 `data/ads.txt` 生成到根路径 `/ads.txt`。若 AdSense 后台的授权信息发生变化，必须以后台提供的完整内容更新该文件。

如果面向欧洲经济区、英国或瑞士用户投放广告，还必须在 AdSense 后台发布 Google Privacy & Messaging 或配置 Google 认证的 CMP；仓库中的隐私说明和链接不能替代同意管理配置。是否通过 AdSense 审核仍取决于线上内容、政策和 Google 的外部审核，不能由本地构建测试证明。

## 文档

- [项目规划](docs/PROJECT_PLAN.md)
- [功能规格](docs/FUNCTIONAL_SPEC.md)
- [技术设计](docs/TECHNICAL_DESIGN.md)
- [部署与运维](docs/OPERATIONS.md)

## 使用与许可证

当前为个人正式项目，源码标记为 `UNLICENSED`，未授权对外复制或再发布。若后续公开源码，需要单独选择并补充 LICENSE。
