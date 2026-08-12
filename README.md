# xyh.wiki Homepage

xyh.wiki 的正式公共首页、服务目录与内容入口。项目整合 `miles-01` 和 `xyh-dep` 上适合访客直接使用的正式服务，按公开、公开演示和受限服务区分访问边界；基础设施、代理、数据库、监控和管理面不进入公共目录。

当前状态：代码、内容、静态生成、测试和 Dokploy 部署模板已实现；根域 DNS、生产部署、Search Console 与 AdSense 审核尚未执行。

## 已实现

- 7 项正式服务目录，支持浏览器本地搜索和分类筛选。
- 每项服务的独立说明页，包括用途、能力、数据边界和使用建议。
- 关于、使用指南、隐私、条款、广告披露、服务范围和联系页面。
- 完整 SSG HTML、独立元数据、canonical、JSON-LD、robots、Sitemap 和真实 404。
- 受限服务说明页 `noindex` 且从 Sitemap 排除。
- AdSense 配置门禁：默认不加载广告脚本、不生成虚假 `ads.txt`。
- 无 npm 第三方依赖的 Node.js 22 构建与测试。
- 非 root Caddy 容器和 miles-01 Dokploy Compose 模板。

## 明确未实现

- 根域 `xyh.wiki` / `www.xyh.wiki` DNS 与生产部署。
- AdSense 账户申请、审核、真实发布商 ID、广告单元和 CMP。
- 实时服务健康监控；目录中的状态是访问边界，不是在线承诺。
- Search Console、线上抓取、分享平台和真实用户 Core Web Vitals 验证。

## 技术栈与渲染

- Node.js 22 原生静态生成脚本
- 语义 HTML、现代 CSS、少量原生 JavaScript
- Node 内置测试运行器
- Caddy 2.10.2 非 root 容器
- Dokploy + Traefik 生产入口

公开内容在构建期写入 HTML，不依赖客户端渲染。公开页面允许索引；受限服务说明页和 404 禁止索引。

## 目录

```text
data/                 站点与服务清单
src/content/          原创指南和政策正文
src/templates/        页面模板
src/assets/           CSS、JS、SVG
scripts/              构建与本地预览
tests/                构建产物测试
deploy/               Dokploy Compose 模板
docs/                 规划、业务、技术和运维文档
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

## 配置

构建变量见 `.env.example`：

- `SITE_URL`：规范站点地址，默认 `https://xyh.wiki`。
- `ADSENSE_CLIENT`：审核通过后设置；为空不加载广告脚本。
- `ADSENSE_PUBLISHER_ID`：账户提供的 `pub-...`；为空只生成 `ads.txt.example`。

不要把真实秘密、Cookie 或其他项目环境文件复制进仓库。AdSense Client/Publisher ID 是公开标识，但仍必须使用账户真实值，不能编造。

## Docker

```bash
docker build -t xyh-homepage:local .
docker run --rm -p 127.0.0.1:4300:3000 xyh-homepage:local
curl -fsS http://127.0.0.1:4300/healthz
```

生产不配置宿主机 published port。部署到 miles-01 时由 Dokploy Traefik 通过内部网络访问容器目标端口 3000。

## SEO 与 AdSense

本项目是公开可收录网站，SEO 直接适用。实现包括初始 HTML 正文、稳定 URL、唯一元数据、canonical、内部链接、结构化数据、robots、Sitemap、受限页 noindex 和轻量首屏。

AdSense 准备不等于保证审核通过。上线前还需要真实域名、可收信联系方式、稳定访问、政策复核和持续原创内容维护；启用广告前必须完成真实账户配置、CMP、隐私更新、ads.txt、布局和性能复验。

## 文档

- [详细项目规划](docs/PROJECT_PLAN.md)
- [功能规格](docs/FUNCTIONAL_SPEC.md)
- [技术设计](docs/TECHNICAL_DESIGN.md)
- [部署与运维](docs/OPERATIONS.md)

## 使用与许可证

当前为个人正式项目，源码标记为 `UNLICENSED`，未授权对外复制或再发布。若后续公开仓库，需要单独选择并补充 LICENSE。
