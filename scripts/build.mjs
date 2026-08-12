import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const load = (relative) => readFile(path.join(root, relative), 'utf8');
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const [siteSource, servicesSource, pageTemplate, homeTemplate, articleTemplate, serviceTemplate] = await Promise.all([
  load('data/site.json'), load('data/services.json'), load('src/templates/page.html'),
  load('src/templates/home.html'), load('src/templates/article.html'), load('src/templates/service.html')
]);

const site = JSON.parse(siteSource);
const services = JSON.parse(servicesSource);
const siteUrl = (process.env.SITE_URL || site.siteUrl).replace(/\/$/, '');
const adsenseClient = (process.env.ADSENSE_CLIENT || site.adsenseClient || '').trim();
const publisherId = (process.env.ADSENSE_PUBLISHER_ID || site.adsensePublisherId || '').trim();

const categories = {
  media: '媒体创作',
  writing: '文本处理',
  developer: '开发者',
  personal: '个人服务'
};
const availability = {
  public: ['公开', ''],
  'public-demo': ['公开演示', 'demo'],
  private: ['受限', 'private']
};
const boundaries = {
  public: '该入口可在未登录状态访问。使用前仍应阅读目标页面的隐私说明，并根据任务内容决定是否适合处理敏感材料。',
  'public-demo': '该入口用于公开演示和技术体验。请勿提交秘密、个人信息、客户资料或生产环境文档。',
  private: '该入口需要账户、持有者授权或特定使用背景。搜索引擎不应索引登录后内容，首页也不会展示内部状态或用户数据。'
};
const guidance = {
  'audio-convert': '转换前保留原始文件。大文件会占用浏览器内存和设备算力，建议先用较小样本确认格式和质量设置。',
  'sonora-studio': '生成式音频具有不确定性。公开发布前请检查歌词、音频内容、供应商条款、版权来源和目标平台规则。',
  'text-tools': '不要把密码、令牌或受保护客户数据直接粘贴到未确认处理边界的工具中；重要结构化内容应先保留副本。',
  'github-trending-cn': '趋势和中文摘要适合初筛，不替代对原仓库许可证、维护状态、安全公告、依赖和发布记录的检查。',
  'rag-support-bot': '回答可能不完整或理解错误。请通过展示的来源核对结论，不要把演示结果直接用于高风险决策。',
  'miles-note': '这是受限个人服务。只有已获授权的使用者才应登录；账户和笔记数据不通过目录公开。',
  'content-publisher': '这是受限个人工作区。发布前需人工核对内容、目标渠道和最终公开链接，不能把自动生成结果视为已批准事实。'
};

function replace(template, variables) {
  return Object.entries(variables).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

function renderMarkdown(source) {
  const lines = source.trim().split(/\r?\n/);
  const blocks = [];
  let list = [];
  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  const inline = (text) => escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue; }
    flushList();
    if (line.startsWith('# ')) blocks.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith('## ')) blocks.push(`<h2>${inline(line.slice(3))}</h2>`);
    else blocks.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  return blocks.join('\n');
}

function adsenseHead() {
  if (!adsenseClient) return '';
  const safeClient = escapeHtml(adsenseClient);
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${safeClient}" crossorigin="anonymous"></script>`;
}

function jsonLd(value) {
  return `<script type="application/ld+json">${JSON.stringify(value).replaceAll('<', '\\u003c')}</script>`;
}

function shell({ title, description, route, body, pageId, robots = 'index,follow', structuredData = [] }) {
  const canonical = `${siteUrl}${route === '/' ? '/' : route}`;
  return replace(pageTemplate, {
    TITLE: escapeHtml(title),
    DESCRIPTION: escapeHtml(description),
    ROBOTS: escapeHtml(robots),
    CANONICAL: escapeHtml(canonical),
    SITE_URL: escapeHtml(siteUrl),
    ADSENSE_HEAD: adsenseHead(),
    JSON_LD: structuredData.map(jsonLd).join('\n'),
    PAGE_ID: escapeHtml(pageId),
    BODY: body
  });
}

function serviceRow(service) {
  const [availabilityLabel, availabilityClass] = availability[service.availability];
  const search = [service.name, service.summary, ...service.features, ...service.keywords].join(' ');
  return `<article class="service-row" data-service-row data-category="${escapeHtml(service.category)}" data-search="${escapeHtml(search)}">
    <div class="service-identity">
      <a href="/services/${escapeHtml(service.slug)}/">${escapeHtml(service.name)}<span aria-hidden="true">→</span></a>
      <p>${escapeHtml(categories[service.category])} · ${escapeHtml(service.host)}</p>
    </div>
    <div class="service-summary"><p>${escapeHtml(service.summary)}</p></div>
    <ul class="service-features">${service.features.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    <span class="availability ${availabilityClass}">${escapeHtml(availabilityLabel)}</span>
  </article>`;
}

async function writeRoute(route, html) {
  const target = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route, 'index.html');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'src/assets'), path.join(dist, 'assets'), { recursive: true });

const publicCount = services.filter((item) => item.availability !== 'private').length;
const privateCount = services.length - publicCount;
const hostCount = new Set(services.map((item) => item.host)).size;
const homeBody = replace(homeTemplate, {
  PUBLIC_COUNT: publicCount,
  PRIVATE_COUNT: privateCount,
  HOST_COUNT: hostCount,
  SERVICE_COUNT: services.length,
  SERVICE_ROWS: services.map(serviceRow).join('\n')
});

await writeRoute('/', shell({
  title: `${site.siteName}｜实用工具与独立项目`,
  description: site.description,
  route: '/',
  pageId: 'home',
  body: homeBody,
  structuredData: [
    {
      '@context': 'https://schema.org', '@type': 'WebSite', name: site.siteName,
      url: `${siteUrl}/`, description: site.description, inLanguage: 'zh-CN'
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'xyh.wiki 服务目录',
      itemListElement: services.filter((item) => item.availability !== 'private').map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.name, url: `${siteUrl}/services/${item.slug}/`
      }))
    }
  ]
}));

const articles = {
  about: ['关于 xyh.wiki', '了解 xyh.wiki 服务目录收录哪些正式项目、如何核对服务事实、区分公开与受限入口，以及维护者遵循的内容原则。'],
  guide: ['如何选择合适的工具', '按媒体转换、文本处理、开源阅读、文档问答和个人工作区选择 xyh.wiki 服务，并了解各场景的数据与结果核对建议。'],
  privacy: ['隐私政策', '了解 xyh.wiki 首页、服务跳转、基础访问日志和后续 Google AdSense 启用时的数据处理、Cookie 披露与用户选择机制。'],
  terms: ['使用条款', '查看 xyh.wiki 首页与服务目录的合理使用规则、知识产权、外部链接、服务可用性、用户责任和联系边界。'],
  advertising: ['广告与商业披露', '了解 xyh.wiki 当前没有启用展示广告的事实、未来 AdSense 接入条件、广告位置原则以及付费排名和误导点击限制。'],
  contact: ['联系方式', '向 xyh.wiki 反馈服务入口、隐私、版权或安全问题时应提供的页面、时间和复现信息，以及不得通过邮件发送的敏感数据。'],
  status: ['服务范围与状态说明', '了解 xyh.wiki 公共服务、公开演示与受限服务的目录状态含义、人工核对范围、非实时在线边界和故障反馈方式。']
};

for (const [slug, [title, description]] of Object.entries(articles)) {
  const markdown = await load(`src/content/${slug}.md`);
  const body = replace(articleTemplate, {
    BREADCRUMB: escapeHtml(title),
    ARTICLE: renderMarkdown(markdown)
  });
  await writeRoute(`/${slug}/`, shell({
    title: `${title}｜${site.siteName}`,
    description,
    route: `/${slug}/`,
    pageId: slug,
    body,
    structuredData: [{
      '@context': 'https://schema.org', '@type': 'WebPage', name: title,
      url: `${siteUrl}/${slug}/`, description, inLanguage: 'zh-CN', isPartOf: { '@type': 'WebSite', name: site.siteName, url: `${siteUrl}/` }
    }]
  }));
}

for (const service of services) {
  const [availabilityLabel] = availability[service.availability];
  const serviceDescription = `${service.summary}查看主要能力、访问边界、界面语言和使用前建议，再前往正式服务。`;
  const body = replace(serviceTemplate, {
    SERVICE_NAME: escapeHtml(service.name),
    SERVICE_URL: escapeHtml(service.url),
    SERVICE_SUMMARY: escapeHtml(service.summary),
    CATEGORY_LABEL: escapeHtml(categories[service.category]),
    AVAILABILITY_LABEL: escapeHtml(availabilityLabel),
    FEATURE_ITEMS: service.features.map((item) => `<li>${escapeHtml(item)}</li>`).join(''),
    BOUNDARY_TEXT: escapeHtml(boundaries[service.availability]),
    GUIDANCE_TEXT: escapeHtml(guidance[service.slug]),
    LANGUAGE: escapeHtml(service.language),
    HOST_LABEL: escapeHtml(service.host)
  });
  await writeRoute(`/services/${service.slug}/`, shell({
    title: `${service.name}：${categories[service.category]}｜${site.siteName}`,
    description: serviceDescription,
    route: `/services/${service.slug}/`,
    pageId: 'service',
    robots: service.availability === 'private' ? 'noindex,follow' : 'index,follow',
    body,
    structuredData: [{
      '@context': 'https://schema.org', '@type': 'WebPage', name: service.name,
      url: `${siteUrl}/services/${service.slug}/`, description: serviceDescription,
      inLanguage: 'zh-CN', mainEntity: { '@type': 'WebApplication', name: service.name, url: service.url, applicationCategory: categories[service.category] }
    }]
  }));
}

const notFoundBody = replace(articleTemplate, {
  BREADCRUMB: '页面不存在',
  ARTICLE: renderMarkdown(await load('src/content/404.md'))
});
await writeFile(path.join(dist, '404.html'), shell({
  title: `页面不存在｜${site.siteName}`,
  description: '请求的页面不存在，请返回 xyh.wiki 首页浏览服务目录。',
  route: '/404.html', pageId: 'not-found', robots: 'noindex,follow', body: notFoundBody
}));

const indexedRoutes = ['/', ...Object.keys(articles).map((slug) => `/${slug}/`), ...services.filter((item) => item.availability !== 'private').map((item) => `/services/${item.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedRoutes.map((route) => `  <url><loc>${escapeHtml(siteUrl + route)}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(path.join(dist, 'site.webmanifest'), JSON.stringify({
  name: site.siteName, short_name: 'xyh.wiki', start_url: '/', display: 'standalone',
  background_color: '#f4f0e6', theme_color: '#18342b', icons: [{ src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
}, null, 2));
await writeFile(path.join(dist, 'site-config.json'), JSON.stringify({ siteUrl, updated: site.updated, adsEnabled: Boolean(adsenseClient) }, null, 2));

if (publisherId) {
  await writeFile(path.join(dist, 'ads.txt'), `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`);
} else {
  await writeFile(path.join(dist, 'ads.txt.example'), 'google.com, pub-REPLACE_WITH_REAL_PUBLISHER_ID, DIRECT, f08c47fec0942fa0\n');
}

console.log(`Built ${indexedRoutes.length} indexable routes and ${services.length} service pages into ${dist}`);
