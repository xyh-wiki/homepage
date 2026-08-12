# 技术设计

- 版本：1.0
- 代码基线：初始正式版
- 日期：2026-08-12

## 1. 设计目标与约束

目标是用最小可维护技术栈生成完整可抓取网站。项目不需要数据库、服务端写接口、客户端框架或 UI 组件库。所有公开正文在构建阶段写入 HTML。

## 2. 技术栈

| 组件 | 版本/来源 | 用途 | 选择理由 |
|---|---|---|---|
| Node.js | 22，Docker 官方 Alpine 镜像 | 构建脚本与本地预览 | 原生 API 足以完成静态生成，无第三方依赖 |
| HTML/CSS/JS | 浏览器原生 | 页面、样式、搜索筛选 | 客户端包体小，禁用 JS 仍可阅读 |
| Caddy | 2.10.2-alpine | 生产静态服务与健康检查 | 与现有项目部署经验一致，配置简洁 |
| Node test runner | Node 22 内置 | 元数据、Sitemap、安全边界测试 | 无新增测试依赖 |
| Docker/Dokploy/Traefik | 目标主机现有平台 | 构建、运行、TLS 与路由 | 符合 miles-01 主机角色，不竞争 80/443 |

项目没有 npm 运行时依赖，不生成 `package-lock.json`。Caddy 使用 Apache-2.0，Node 官方镜像遵循其上游许可；项目源码标记为 `UNLICENSED`，正式开源前需另行选择许可证。

## 3. 模块与目录

```text
data/site.json              站点级公开配置
data/services.json          服务目录事实
src/content/*.md            指南、政策和说明正文
src/templates/*.html        页面外壳与页面模板
src/assets/                 CSS、JS、SVG
scripts/build.mjs           静态生成、SEO 文件与 ads.txt 门禁
scripts/serve.mjs           本地静态预览与真实 404
tests/build.test.mjs        构建产物验收
Dockerfile / Caddyfile      非 root 生产镜像
deploy/dokploy-compose.yaml Dokploy Compose 模板
```

依赖方向：内容与数据 → 构建器 → `dist`；生产运行时只读取 `dist`。

## 4. 构建链路

1. 读取站点配置、服务 JSON、模板和 Markdown。
2. 对用户可见数据执行 HTML 转义。
3. 生成首页、文章页、服务说明页和 404。
4. 根据 `availability` 决定 robots 与 Sitemap 收录。
5. 生成 canonical、Open Graph、Twitter Card 和 JSON-LD。
6. 复制本地 CSS/JS/SVG，生成 robots、Sitemap、Manifest 和站点构建信息。
7. 仅在真实广告配置存在时注入脚本或生成 `ads.txt`。

构建失败直接退出，不静默跳过缺失文件或无效 JSON。

## 5. 安全设计

- 所有服务 URL 由版本库人工维护，测试要求 HTTPS、xyh.wiki 子域和无显式端口。
- 构建输出转义 HTML，JSON-LD 中的 `<` 也转义，防止内容配置注入页面结构。
- 页面无表单提交、认证、数据库和服务端业务接口，CSRF、事务、并发写和幂等不适用。
- Caddy 设置 CSP、HSTS、`nosniff`、`DENY` frame、严格 referrer 和受限 Permissions Policy。
- CSP 已为未来 AdSense/CMP 保留必要域名；启用前应根据 Google 实际脚本请求再次收紧和验证，不能假定当前列表永远完整。
- 容器以 UID/GID 65532 运行，根文件系统只读，`/config` 与 `/data` 使用 tmpfs，启用 `no-new-privileges`。
- 不在目录中输出 IP、端口、健康详情、管理地址、秘密或监控数据。

## 6. SEO 设计

- 公开页面为 SSG，正文在初始 HTML。
- 每页唯一 title、description、H1 和绝对 canonical。
- 首页输出 `WebSite` 与真实 `ItemList`；服务说明页输出与可见内容一致的 `WebPage`/`WebApplication`；文章输出 `WebPage`。
- Sitemap 不包含受限服务和 404；robots 允许抓取公开资源并声明 Sitemap。
- 首页、页脚、服务列表和相关文章形成内部链接，避免孤立页面。
- 受限服务使用 `noindex,follow`，但真正访问控制仍由目标服务负责。
- 不输出 meta keywords，不伪造评分、作者资历、发布日期、FAQ 或用户指标。
- 社交图是本地 SVG；上线后需验证目标分享平台是否接受 SVG，若不接受再生成 1200×630 PNG，不影响页面本身 SEO。

## 7. 广告集成

构建参数：

- `ADSENSE_CLIENT`：例如 `ca-pub-...`，非空才加载异步脚本。
- `ADSENSE_PUBLISHER_ID`：例如 `pub-...`，非空才生成根路径 `ads.txt`。

初始版仅显示文本化预留区域，不包含 `<ins class="adsbygoogle">`，避免在未批准前发起广告请求。批准后应新增明确广告组件，并测试：无填充、脚本阻断、慢网、CMP 拒绝、非个性化广告、布局稳定和 CLS。

## 8. 性能

- 无远程字体、框架 hydration 和首屏图片。
- CSS/JS 本地缓存；HTML no-cache；zstd/gzip 由 Caddy 提供。
- 搜索只遍历当前 7 行服务，复杂度和主线程成本可忽略。
- AdSense 未启用，因此本地性能不能代表未来广告脚本下的真实数据；启用后需重新测量移动端 p75 LCP、INP、CLS。

## 9. 测试映射

| 风险 | 自动化验证 |
|---|---|
| 页面漏生成 | 所有文章与服务路径存在 |
| 元数据重复或缺失 | 可索引页面 title/description 唯一，canonical/H1/JSON-LD 存在 |
| 私有页被索引 | `noindex` 且 Sitemap 排除 |
| 泄露主机信息 | URL 规则与首页 IP/localhost 检查 |
| 误加载广告 | 默认构建无 Google 脚本、无 `ads.txt` |
| 根域配置错误 | robots 与 Sitemap 使用 `https://xyh.wiki` |

容器、浏览器截图、Lighthouse 和外部 HTTPS 是额外集成验证。

## 10. 部署与回滚

- Dokploy 从 Git 构建 Dockerfile，目标端口 3000，不设置宿主机 published port。
- 根域和 www 在 Dokploy Domains 绑定；www 使用 301/308 到根域。
- DNS 指向 miles-01 后由 Traefik 签发 TLS。
- 发布前记录上一镜像/部署；该站无数据库和卷，回滚为切回上一镜像和恢复上一 DNS/路由。
- 健康检查：`GET /healthz` 返回 200 与 `ok`。

详细步骤见 `docs/OPERATIONS.md`。

## 11. 技术债与后续

- 联系邮箱需在生产发布前验证 MX/收信能力。
- 服务清单需要维护流程或只读自动发现校验，但不应直接把主机监听端口自动发布到公网目录。
- AdSense 启用后的 CMP、区域同意和 CSP 需要基于真实账户配置完成。
- 分享 SVG 的平台兼容性需要线上验证，必要时补 PNG。
