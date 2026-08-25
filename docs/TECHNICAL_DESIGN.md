# 技术设计

- 版本：1.1
- 日期：2026-08-25

## 1. 目标与约束

项目以最小技术栈生成完整、可抓取、易扩展的项目目录。没有数据库、服务端写接口、客户端框架或 UI 组件库，所有公开正文在构建阶段写入 HTML。

视觉采用中性工作区风格：白色和浅灰背景、系统无衬线字体、单一蓝色强调、连续列表、细边线和稳定留白。不使用渐变、阴影、巨型衬线标题、眉题、大数字指标栏或广告占位元素。

## 2. 技术栈

| 组件 | 版本/来源 | 用途 | 选择理由 |
|---|---|---|---|
| Node.js | 22，Docker 官方 Alpine 镜像 | 构建脚本与本地预览 | 原生 API 足够，无第三方依赖 |
| HTML/CSS/JS | 浏览器原生 | 页面、样式、搜索筛选和 AdSense 加载 | 核心页面包体小，广告异步加载，禁用 JS 仍可阅读 |
| Caddy | 2.10.2-alpine | 生产静态服务与健康检查 | 配置简洁，支持安全响应头和真实 404 |
| Node test runner | Node 22 内置 | 构建产物和数据边界测试 | 无新增测试依赖 |
| Docker/Dokploy/Traefik | 现有部署平台 | 构建、运行、TLS 与路由 | 不占用宿主机 80/443 |

项目没有 npm 运行时依赖，不生成 `package-lock.json`。

## 3. 数据与模块

```text
data/site.json              站点名称、地址和描述
data/ads.txt                根域名广告授权声明
data/catalog.json           分类与访问类型
data/services.json          项目事实、搜索信息和使用建议
src/content/*.md            指南、政策和说明正文
src/templates/*.html        页面外壳与页面模板
src/assets/                 CSS、JavaScript 和 SVG
scripts/build.mjs           校验、静态生成和 SEO 文件
scripts/serve.mjs           本地预览与真实 404
tests/build.test.mjs        构建产物验收
Dockerfile / Caddyfile      非 root 生产镜像
deploy/dokploy-compose.yaml Dokploy Compose 模板
```

依赖方向为：数据和内容 → 校验 → 构建器 → `dist`。生产运行时只读取 `dist`。

## 4. 扩展机制

### 添加现有分类中的项目

在 `data/services.json` 增加记录。构建器自动生成：

- 首页项目行；
- 本地搜索数据；
- 项目详情页；
- 页面 title、description 和 JSON-LD；
- Sitemap 收录状态；
- 首页项目总数。

### 添加分类

在 `data/catalog.json` 的 `categories` 中增加配置。首页筛选按钮、项目列表分类和详情页分类由同一份配置生成。

### 添加访问类型

在 `data/catalog.json` 的 `availability` 中增加配置，并设置显示名称、首页短标记、索引策略和通用使用说明。

### 数据校验

构建开始前验证：

- 站点和目录配置存在；
- 分类 ID 格式与唯一性；
- 项目 slug、名称和 URL 唯一；
- 项目引用的分类与访问类型存在；
- 摘要、语言和使用建议非空；
- 能力至少 3 项；
- 搜索关键词非空；
- URL 为无显式端口的 HTTPS `xyh.wiki` 子域。

模板替换后若仍存在未解析变量，构建直接失败。

## 5. 构建链路

1. 并行读取站点配置、目录配置、项目数据和模板。
2. 解析 JSON 并执行数据校验。
3. 对公开数据执行 HTML 转义。
4. 生成首页、文章页、项目详情页和 404。
5. 根据访问类型的 `indexable` 配置决定 robots 与 Sitemap。
6. 生成 canonical、Open Graph、Twitter Card、JSON-LD、robots、Sitemap 和 Manifest。
7. 根据 CSS、JavaScript 和 SVG 内容生成短哈希版本参数，避免发布后继续使用旧缓存。
8. 生成根路径 `ads.txt`，供广告平台抓取授权关系。
9. 复制本地静态资源到 `dist`。

构建失败直接退出，不跳过错误记录。

## 6. 安全与公开边界

- 所有目标 URL 由版本库维护，并通过构建器和测试检查。
- HTML 输出和 JSON-LD 对危险字符进行转义。
- `host` 字段仅用于内部维护，渲染函数不读取该字段。
- 回归测试扫描全部生成 HTML，禁止内部主机名、运行节点、维护节点、维护日期和未启用业务规划进入公开页面。
- Caddy CSP 允许本站资源、AdSense 和 Google Privacy & Messaging 所需的 Google 脚本、连接、图片与框架域名；未为广告开放 `unsafe-inline` 或 `unsafe-eval`，核心页面不依赖广告脚本。
- 容器使用 UID/GID 65532、只读根文件系统和 `no-new-privileges`。

## 7. SEO

- 公开页面为 SSG，正文在初始 HTML。
- 每页具有唯一 title、description、H1 和绝对 canonical。
- 首页输出 `WebSite` 与公开项目 `ItemList`。
- 项目页输出与可见内容一致的 `WebPage` 和 `WebApplication`。
- Sitemap 仅包含允许索引的项目；其他项目页使用 `noindex,follow`。
- `/advertising/` 旧地址由 Caddy 永久跳转至 `/privacy/`，避免保留已经删除的公开规划页面。
- 404 页面使用同一页面外壳但显式关闭 AdSense，避免在无内容错误页投放广告。
- 不输出 meta keywords、评分、用户数、伪发布日期或不可验证指标。

## 8. 性能与可访问性

- 不加载远程字体、前端框架运行时和首屏图片；Google AdSense 作为异步第三方脚本加载。
- CSS/JavaScript 使用内容哈希查询参数和长期缓存，HTML 使用 no-cache。
- 搜索仅遍历当前页面项目行。
- 保留跳过链接、语义结构、可见焦点和减少动态效果支持。
- 首页精选项目与完整目录均使用连续列表；分类筛选在小屏横向滚动，避免多行控件挤压内容。
- 原生 JavaScript 提供“更多”导航菜单、`/` 搜索快捷键、搜索清除、空结果清除和 `aria-pressed` 状态同步。

## 9. 测试映射

| 风险 | 自动化验证 |
|---|---|
| 页面漏生成 | 所有文章和项目路径存在 |
| 分类硬编码或漏生成 | 分类配置对应筛选按钮，项目行数等于数据记录数 |
| 元数据重复或缺失 | 可索引页面 title/description 唯一，canonical/H1/JSON-LD 存在 |
| 非公开页被索引 | `noindex` 且 Sitemap 排除 |
| 目标 URL 不安全 | HTTPS、目标域、无显式端口 |
| 内部或规划信息泄露 | 扫描所有生成 HTML 的禁止词 |
| 根域配置错误 | robots 与 Sitemap 使用正式域名 |
| 首页交互不可访问 | 检查精选项目数量、导航菜单状态、搜索清除按钮和筛选 `aria-pressed` |
| 广告脚本漏装或重复 | 扫描全部生成 HTML，确认每页仅加载一次指定 AdSense 客户端脚本 |
| 广告授权文件缺失或内容错误 | 检查 `/ads.txt` 生成路径、精确内容和 HTTP 200 |
| 错误页投放广告 | 检查 `404.html` 不包含 AdSense loader |

## 10. 部署与回滚

- Dokploy 从 Git 构建 Dockerfile，目标端口 3000，不设置宿主机 published port。
- Traefik 负责正式域名和 TLS。
- 健康检查为 `GET /healthz`，应返回 200 与 `ok`。
- 该站没有数据库和持久卷，回滚为恢复上一部署或镜像。

详细步骤见 `docs/OPERATIONS.md`。
