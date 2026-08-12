# xyh.wiki Homepage 正式项目规划

- 文档版本：1.0
- 基线日期：2026-08-12
- 交付类型：正式公共网站，不是测试页
- 目标入口：`https://xyh.wiki/`，建议同时将 `https://www.xyh.wiki/` 永久跳转至根域
- 运行目标：`miles-01` Dokploy + Traefik

## 1. 背景与现状

2026-08-12 对两台主机进行了只读盘点：

- `miles-01` 由 Dokploy/Traefik 管理普通业务应用，当前确认的公开应用域名包括 `audio-convert.xyh.wiki`、`gen-aimusic.xyh.wiki`、`text-tools.xyh.wiki` 和 `publisher.xyh.wiki`；其中 Publisher 是登录服务。
- `xyh-dep` 使用宿主机 Caddy 保留既有服务，当前确认入口包括 `git-trending.xyh.wiki`、`note.xyh.wiki`、`bot.xyh.wiki`、`proxy*.xyh.wiki`、`dokploy.xyh.wiki` 和 `umami.xyh.wiki`。
- 根域 `xyh.wiki` 与 `www.xyh.wiki` 在盘点时尚未解析。
- 代理、数据库、缓存、管理面和分析后台属于基础设施或受限管理服务，不适合作为公共导航项目，也不应为 AdSense 制造可索引登录页。

因此 Homepage 不是“暴露所有监听端口”，而是**集成所有适合用户跳转的正式服务**，并按公开、公开演示、受限三种边界展示。基础设施继续保留但不进入公开目录。

## 2. 产品目标

1. 为 xyh.wiki 形成稳定、可分享、可抓取的根入口。
2. 让访客按任务找到工具，而不是先理解服务部署在哪台机器。
3. 给每个服务提供独立、原创、可索引的说明页；受限服务说明页使用 `noindex`。
4. 提供关于、指南、隐私、条款、广告披露、服务范围和联系页面，形成完整站点身份与导航。
5. 在不影响主要内容和可访问性的前提下预留 AdSense 接入点，但未取得发布商 ID 前不加载广告脚本、不发布伪造 `ads.txt`。
6. 采用静态生成和少量原生 JavaScript，降低维护、性能和供应链成本。

## 3. 非目标

- 不显示主机 CPU、内存、容器、端口或实时在线状态。
- 不把 Dokploy、Umami、代理面板、API、PostgreSQL、Redis 等内部或高风险入口做成公共目录。
- 不为提高页面数量批量制造薄内容、伪 FAQ、虚构评价、虚假指标或重复关键词页。
- 不在本任务中擅自创建 DNS、修改 Cloudflare、注册 AdSense、提交 Search Console 或发布生产变更。
- 不承诺 AdSense 一定通过；审核决定、流量质量和政策持续合规由 Google 最终判断。

## 4. 用户与核心场景

| 用户 | 目标 | 页面路径 |
|---|---|---|
| 普通访客 | 找到音视频、文本或创作工具 | 首页筛选 → 服务说明 → 子域名 |
| 开发者读者 | 阅读 GitHub 趋势或体验文档问答 | 首页开发者分类 → 服务说明 |
| 已授权个人用户 | 进入笔记或发布工作区 | 首页个人服务分类 → `noindex` 说明页 → 登录入口 |
| 搜索引擎 | 理解站点主题和公开服务关系 | 预渲染 HTML、内部链接、canonical、Sitemap、JSON-LD |
| 广告审核人员 | 判断站点身份、内容价值、导航和政策页面 | 首页、指南、关于、隐私、条款、广告披露、联系 |

## 5. 信息架构

### 可索引

- `/`
- `/guide/`
- `/about/`
- `/privacy/`
- `/terms/`
- `/advertising/`
- `/contact/`
- `/status/`
- `/services/audio-convert/`
- `/services/sonora-studio/`
- `/services/text-tools/`
- `/services/github-trending-cn/`
- `/services/rag-support-bot/`

### 禁止索引

- `/services/miles-note/`
- `/services/content-publisher/`
- `/404.html`

受限服务保留可点击入口，但不进入 Sitemap，不作为可收录内容目标。

## 6. 页面与交互设计

- 完整视口布局：顶栏、连续主内容、服务列表、编辑式说明区和页脚。
- 不采用常见三列功能卡阵列；服务使用紧凑列表，桌面展示名称、摘要、关键能力和访问边界，移动端按阅读顺序重排。
- 首页主要动作是“浏览全部服务”；搜索和分类筛选只做目录内查找。
- 颜色使用低饱和米白、深绿和少量陶土橙，主要层级依靠排版、边线和留白，不依赖玻璃、发光和厚阴影。
- 支持键盘、跳过链接、可见焦点、语义标签、360–430px 移动宽度和减少动态效果设置。

## 7. AdSense 准备策略

根据 2026-08-12 读取的 Google 官方帮助内容：AdSense 申请要求自有、原创且有吸引力的内容并遵守发布商政策；隐私政策需披露 Google 和其他第三方广告供应商使用 Cookie 的方式；面向 EEA、英国和瑞士的相关广告处理需要满足 Google EU 用户同意政策；`ads.txt` 虽非强制但被高度建议，并必须使用账户中的真实发布商 ID。

本项目落实：

1. 首页不是纯链接农场：包含目录选择逻辑、访问边界、维护原则和原创指南。
2. 每个公开服务有独立说明页，描述真实用途、风险和使用建议。
3. 提供隐私、条款、联系、广告披露和站点身份页面。
4. 广告区域位于主要内容之后，不模仿导航、下载或打开服务按钮。
5. `ADSENSE_CLIENT` 为空时不加载 Google 脚本；审核通过后通过构建参数启用。
6. `ADSENSE_PUBLISHER_ID` 为空时只生成 `ads.txt.example`，不发布虚假授权记录。
7. 正式启用前必须配置 Google 认可的 CMP/Privacy & messaging 流程，并完成地区化同意验证。
8. 不在登录页、404、空页或受限服务说明页投放广告。

## 8. 技术方案

- Node.js 22 原生脚本作为静态生成器，无运行时 npm 依赖。
- 内容来源：`data/services.json` 与 `src/content/*.md`。
- 输出：完整预渲染 HTML、CSS、少量目录筛选 JavaScript、Sitemap、robots 和 Web Manifest。
- 生产容器：多阶段构建，Caddy 2.10.2 非 root 用户运行，容器目标端口 3000，无宿主机 published port。
- 安全：CSP、HSTS、nosniff、frame deny、最小 Permissions Policy；Compose 使用只读根文件系统和 `no-new-privileges`。
- 部署：Git 仓库接入 `miles-01` Dokploy，Traefik 负责根域和 TLS。

## 9. 验收标准

### 功能

- 7 个正式用户入口全部可从首页发现。
- 搜索与分类筛选可用，空结果有明确提示。
- 每项服务可进入独立说明页并打开目标子域名。
- 受限服务明确标识，不显示内部状态。

### SEO

- 每个可索引页面只有一个 H1、独立 title/description、绝对 canonical 和 JSON-LD。
- 公开正文存在于初始 HTML，不依赖 JavaScript 获取。
- Sitemap 只包含 canonical、允许索引的页面；robots 声明 Sitemap。
- 受限服务和 404 为 `noindex`。
- 所有重要页面从首页或页脚可达。

### 性能与可访问性

- 首屏不依赖远程字体、图片和第三方脚本。
- 禁用 JavaScript时仍可阅读全部内容并点击服务链接。
- 360px 和桌面宽度无横向裁切。
- 键盘焦点可见，搜索框和筛选按钮有可访问名称。

### 部署

- 容器以 UID 65532 运行且健康。
- 不发布宿主机端口；Traefik 通过 Dokploy 网络访问 3000。
- 根域 HTTPS、`/healthz`、`/robots.txt`、`/sitemap.xml` 和一个服务说明页返回正确状态。
- 发布前备份/记录上一 Dokploy 部署作为回滚点。

## 10. 阶段与外部依赖

1. 本地规划、实现、测试和镜像验证。
2. 创建远程 Git 仓库并推送（需要用户授权或既有仓库）。
3. 在 DNS 提供商创建根域和 www 记录（需要域名控制权限）。
4. 在 Dokploy 创建应用、绑定域名和 TLS（生产变更，需明确授权）。
5. 外部 SEO/安全/移动端检查，提交 Sitemap。
6. 准备足够真实访问与内容维护记录后申请 AdSense。
7. 审核通过后配置真实 Client/Publisher ID、CMP 和 `ads.txt`，再次验证隐私、性能和广告布局。

## 11. 主要风险

- 根域当前未解析，代码完成不等于已上线。
- AdSense 不公布固定文章数或字数门槛；本站只能提升准备度，不能保证审核结果。
- 部分子域名仍是客户端 SPA，Homepage 能改善站点发现与说明，但不能替代其自身 SSR/SSG 改造。
- 联系邮箱需在上线前确认真实可收信；当前按站点域名使用 `hello@xyh.wiki` 作为正式占位配置。
- 服务清单不是实时监控，新增或下线服务需要人工同步。
