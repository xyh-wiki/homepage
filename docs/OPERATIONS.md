# 部署与运维手册

## 1. 环境

- 源码：`/data/projects/homepage`
- 目标：`miles-01` Dokploy
- 公网入口：Dokploy Traefik 独占 80/443
- 目标域名：`xyh.wiki`，可选 `www.xyh.wiki` 永久跳转到根域
- 容器端口：3000，仅 expose，不配置宿主机 published port

## 2. 本地验证

```bash
npm run test
docker build -t xyh-homepage:local .
docker run --rm -d --name xyh-homepage-local -p 127.0.0.1:4300:3000 xyh-homepage:local
curl -fsS http://127.0.0.1:4300/healthz
curl -fsS http://127.0.0.1:4300/robots.txt
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4300/not-found
docker rm -f xyh-homepage-local
```

本地 published port 仅用于开发验证，不复制到 Dokploy。

## 3. 发布前门禁

1. 确认 Git 工作区只包含本项目变更。
2. 运行 `npm run test`、`git diff --check`、Docker 构建和容器健康检查。
3. 确认 `SITE_URL=https://xyh.wiki`。
4. 确认联系邮箱真实可收信；不可用时先替换站内地址。
5. AdSense 尚未批准时保持两个广告变量为空。
6. 记录镜像摘要和 SHA-256；若已有线上版本，记录回滚目标。
7. 不复制 `.env`、秘密、开发数据库或其他项目工作区。

## 4. Dokploy 部署

推荐 Git 仓库 Dockerfile 应用：

- Build context：仓库根目录
- Dockerfile：`Dockerfile`
- Container port：`3000`
- Health path：`/healthz`
- Domain：`xyh.wiki`
- Host published ports：无
- 网络：Dokploy/Traefik 默认网络

如使用 Compose，采用 `deploy/dokploy-compose.yaml`，不要额外启动宿主机 Caddy。

## 5. DNS 与 TLS

在 DNS 提供商创建根域记录指向 miles-01。若使用 Cloudflare：

1. 先用 DNS only 验证源站路由和 TLS。
2. 确认 Traefik 已签发证书、HTTP 永久跳转 HTTPS。
3. 再根据既有策略启用代理。
4. `www` 应一对一永久跳转至 `https://xyh.wiki/`，不要形成两个可索引站点。

## 6. 上线验证

```bash
curl -fsSI https://xyh.wiki/
curl -fsS https://xyh.wiki/healthz
curl -fsS https://xyh.wiki/robots.txt
curl -fsS https://xyh.wiki/sitemap.xml
curl -fsSI https://xyh.wiki/services/audio-convert/
curl -fsSI https://xyh.wiki/does-not-exist
```

还需验证：

- 首页和政策页状态 200；未知页 404。
- 容器 UID 非 0、健康、无宿主机 published port。
- Traefik 路由、源站 TLS 与 Cloudflare HTTPS。
- 桌面和 360–430px 移动端布局、键盘焦点、无横向裁切。
- 渲染 HTML 中 title、description、canonical、robots、H1、正文和 JSON-LD。
- 断链与全部服务外跳。
- Search Console 提交 Sitemap；真实抓取和 Core Web Vitals 需要上线后观察。

## 7. AdSense 启用

只有账户和站点通过审核、隐私政策已复核、CMP 已配置后执行：

1. 在 Dokploy 构建参数设置真实 `ADSENSE_CLIENT` 与 `ADSENSE_PUBLISHER_ID`。
2. 根据批准的广告布局实现并审阅广告单元；不要只依赖当前文字预留位。
3. 重新构建，确认 `/ads.txt` 内容与 AdSense 账户给出的记录完全一致。
4. 验证 EEA/英国/瑞士同意消息、拒绝路径、撤回选择和非个性化广告。
5. 检查 CSP 控制台错误、广告与按钮间距、CLS、移动端遮挡和无填充状态。
6. 更新隐私政策和广告披露的实际启用日期。

## 8. 备份与回滚

网站无数据库和持久卷。备份对象为 Git commit、镜像摘要、Dokploy 配置和 DNS 路由记录。

回滚条件：健康检查失败、首页/政策页不可用、TLS 错误、严重布局阻断、错误广告脚本或 CSP 使主要页面失效。

回滚动作：在 Dokploy 恢复上一镜像/部署；若根域刚切换且源站不可用，恢复上一 DNS 记录；完成后再次验证 HTTPS、首页和健康检查。

## 9. 故障排查

- 404 异常：检查 Caddy `try_files` 和生成目录。
- canonical 错误：检查构建参数 `SITE_URL`，重新构建，不在运行时替换 HTML。
- 服务遗漏：更新 `data/services.json`，同步功能规格和项目规划后重新测试。
- 广告未显示：先检查审批、ads.txt、CMP、CSP 和浏览器阻止情况，不通过诱导点击或扩大广告密度“修复”。
