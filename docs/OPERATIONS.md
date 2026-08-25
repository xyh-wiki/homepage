# 部署与运维手册

## 1. 环境

- 源码：`/data/projects/homepage`
- 部署方式：Dokploy Git/Dockerfile 应用
- 正式地址：`https://xyh.wiki/`
- 容器端口：3000，仅 expose，不配置宿主机 published port
- 当前状态：正式站点已经上线；本地未发布改动不代表线上已更新

内部主机角色和地址属于运维信息，不写入公开页面。

## 2. 本地验证

```bash
npm run test
docker build -t xyh-homepage:local .
docker run --rm -d --name xyh-homepage-local -p 127.0.0.1:4300:3000 xyh-homepage:local
curl -fsS http://127.0.0.1:4300/healthz
curl -fsS http://127.0.0.1:4300/robots.txt
curl -fsS http://127.0.0.1:4300/ads.txt
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4300/not-found
curl -fsSI http://127.0.0.1:4300/advertising/
docker rm -f xyh-homepage-local
```

预期：

- `/healthz` 返回 200 和 `ok`；
- 未知路径返回 404；
- `/advertising/` 永久跳转到 `/privacy/`；
- 公开 HTML 不包含内部主机或未启用的规划。
- 页面包含 `ca-pub-8907413334960000` 对应的异步 AdSense 加载脚本。
- `/ads.txt` 返回 `google.com, pub-8907413334960000, DIRECT, f08c47fec0942fa0`。

## 3. 发布前门禁

1. 确认 Git 工作区只包含本项目变更。
2. 运行 `npm run test`、`git diff --check`、Node 语法检查和 JSON 校验。
3. 运行 Docker 构建、容器健康检查和关键路径 HTTP 检查。
4. 检查桌面与移动端布局、搜索、筛选、键盘焦点和横向溢出。
5. 确认 `SITE_URL=https://xyh.wiki`。
6. 确认联系邮箱真实可用。
7. 记录当前线上 Git 提交或部署版本作为回滚目标。
8. 不复制 `.env`、秘密、开发数据库或其他项目工作区。

## 4. Dokploy 部署

推荐配置：

- Build context：仓库根目录
- Dockerfile：`Dockerfile`
- Container port：`3000`
- Health path：`/healthz`
- Domain：`xyh.wiki`
- Host published ports：无
- 网络：Dokploy/Traefik 默认网络

如使用 Compose，采用 `deploy/dokploy-compose.yaml`，不要额外启动占用公网 80/443 的服务。

## 5. DNS 与 TLS

DNS 和 TLS 已完成配置。更换源站或路由时：

1. 记录当前 DNS、代理状态和回滚值。
2. 先验证新源站路由与证书。
3. 使用 `curl` 和桌面、移动网络验证 HTTPS。
4. 保持根域为唯一 canonical 地址。
5. 若配置 `www`，使用一对一永久跳转到根域。

## 6. 上线验证

```bash
curl -fsSI https://xyh.wiki/
curl -fsS https://xyh.wiki/healthz
curl -fsS https://xyh.wiki/robots.txt
curl -fsS https://xyh.wiki/ads.txt
curl -fsS https://xyh.wiki/sitemap.xml
curl -fsSI https://xyh.wiki/services/audio-convert/
curl -fsSI https://xyh.wiki/advertising/
curl -fsSI https://xyh.wiki/does-not-exist
```

还需验证：

- 首页和政策页返回 200，未知页返回 404。
- 旧 `/advertising/` 地址永久跳转到 `/privacy/`。
- 容器以非 root 用户运行、健康、无宿主机 published port。
- 首页搜索和所有分类筛选正常。
- 桌面和 360–430px 移动端无横向裁切。
- HTML 中 title、description、canonical、robots、H1、正文和 JSON-LD 正确。
- 非公开项目页为 `noindex`，并从 Sitemap 排除。
- 公开 HTML 不含内部主机、端口和未启用规划。
- 响应 CSP 允许 AdSense 的 HTTPS 脚本、连接、图片和广告框架，浏览器控制台无相关 CSP 拦截。
- 根路径 `/ads.txt` 返回 200，并且内容与 AdSense 后台提供的授权行完全一致。
- 广告未通过审核、未配置自动广告、需要地区同意或暂无库存时可能不展示；不能仅以页面没有广告判断部署失败。

## 7. 添加项目

1. 在 `data/services.json` 增加项目记录。
2. 如需新分类或访问类型，编辑 `data/catalog.json`。
3. 同步受影响的使用说明或项目文档。
4. 运行 `npm run test`。
5. 本地检查首页项目数量、筛选项、详情页、Sitemap 和索引状态。
6. 完成评审后再提交和发布。

构建器会阻止重复 slug、名称、URL、未知分类、未知访问类型、字段缺失和不安全 URL。

## 8. 备份与回滚

网站无数据库和持久卷。备份对象为 Git commit、镜像摘要、Dokploy 配置和 DNS 路由记录。

回滚条件：

- 健康检查失败；
- 首页或政策页不可用；
- TLS 错误；
- 搜索、导航或布局严重阻断；
- Sitemap、canonical 或索引策略错误；
- 公开页面泄露内部信息。

回滚动作：在 Dokploy 恢复上一部署或镜像；如同时修改了 DNS，则恢复上一记录。完成后重新验证 HTTPS、首页、健康检查和关键页面。

## 9. 故障排查

- 404 异常：检查 Caddy `try_files` 和生成目录。
- canonical 错误：检查 `SITE_URL`，重新构建。
- 项目遗漏：检查 `data/services.json` 是否通过构建校验。
- 分类未显示：检查 `data/catalog.json` 的分类 ID 和标签。
- 构建提示模板变量未解析：检查模板占位符和 `scripts/build.mjs` 的替换参数是否同步。
- 样式在浏览器未更新：确认 HTML 中资源版本参数已经变化，并检查当前部署版本与 CDN 缓存。
