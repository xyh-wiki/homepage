import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

const [
  siteSource, catalogSource, servicesSource, pageTemplate, homeTemplate, articleTemplate, serviceTemplate,
  stylesSource, scriptSource, faviconSource, socialPreviewSource
] = await Promise.all([
  load('data/site.json'), load('data/catalog.json'), load('data/services.json'), load('src/templates/page.html'),
  load('src/templates/home.html'), load('src/templates/article.html'), load('src/templates/service.html'),
  load('src/assets/styles.css'), load('src/assets/site.js'), load('src/assets/favicon.svg'), load('src/assets/social-preview.svg')
]);

const site = JSON.parse(siteSource);
const catalog = JSON.parse(catalogSource);
const services = JSON.parse(servicesSource);
const siteUrl = (process.env.SITE_URL || site.siteUrl).replace(/\/$/, '');
const assetVersion = createHash('sha256')
  .update(stylesSource)
  .update(scriptSource)
  .update(faviconSource)
  .update(socialPreviewSource)
  .digest('hex')
  .slice(0, 12);

function fail(message) {
  throw new Error(`Invalid catalog data: ${message}`);
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} must be a non-empty string`);
}

function validateData() {
  requireText(site.siteName, 'site.siteName');
  requireText(site.siteUrl, 'site.siteUrl');
  requireText(site.description, 'site.description');
  if (!Array.isArray(catalog.categories) || !catalog.categories.length) fail('catalog.categories must not be empty');
  if (!catalog.availability || typeof catalog.availability !== 'object' || Array.isArray(catalog.availability)) {
    fail('catalog.availability is required');
  }
  if (!Array.isArray(services) || !services.length) fail('services must not be empty');

  const categoryIds = new Set();
  for (const category of catalog.categories) {
    requireText(category.id, 'category.id');
    requireText(category.label, `category ${category.id}.label`);
    requireText(category.filterLabel, `category ${category.id}.filterLabel`);
    if (!/^[a-z][a-z0-9-]*$/.test(category.id)) fail(`category id "${category.id}" is invalid`);
    if (categoryIds.has(category.id)) fail(`duplicate category id "${category.id}"`);
    categoryIds.add(category.id);
  }

  for (const [id, item] of Object.entries(catalog.availability)) {
    requireText(id, 'availability id');
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail(`availability ${id} must be an object`);
    requireText(item.label, `availability ${id}.label`);
    requireText(item.boundary, `availability ${id}.boundary`);
    if (typeof item.listLabel !== 'string') fail(`availability ${id}.listLabel must be a string`);
    if (typeof item.indexable !== 'boolean') fail(`availability ${id}.indexable must be a boolean`);
  }

  const slugs = new Set();
  const names = new Set();
  const urls = new Set();
  for (const service of services) {
    requireText(service.slug, 'service.slug');
    requireText(service.name, `service ${service.slug}.name`);
    requireText(service.url, `service ${service.slug}.url`);
    requireText(service.summary, `service ${service.slug}.summary`);
    requireText(service.category, `service ${service.slug}.category`);
    requireText(service.availability, `service ${service.slug}.availability`);
    requireText(service.host, `service ${service.slug}.host`);
    requireText(service.language, `service ${service.slug}.language`);
    requireText(service.guidance, `service ${service.slug}.guidance`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug)) fail(`service slug "${service.slug}" is invalid`);
    if (slugs.has(service.slug)) fail(`duplicate service slug "${service.slug}"`);
    if (names.has(service.name)) fail(`duplicate service name "${service.name}"`);
    if (urls.has(service.url)) fail(`duplicate service URL "${service.url}"`);
    if (!categoryIds.has(service.category)) fail(`service ${service.slug} uses unknown category "${service.category}"`);
    if (!Object.hasOwn(catalog.availability, service.availability)) {
      fail(`service ${service.slug} uses unknown availability "${service.availability}"`);
    }
    if (!Array.isArray(service.features) || service.features.length < 3 || service.features.some((item) => typeof item !== 'string' || !item.trim())) {
      fail(`service ${service.slug}.features must contain at least three non-empty strings`);
    }
    if (!Array.isArray(service.keywords) || !service.keywords.length || service.keywords.some((item) => typeof item !== 'string' || !item.trim())) {
      fail(`service ${service.slug}.keywords must contain non-empty strings`);
    }
    let url;
    try {
      url = new URL(service.url);
    } catch {
      fail(`service ${service.slug}.url is invalid`);
    }
    if (url.protocol !== 'https:' || url.port || !url.hostname.endsWith('.xyh.wiki')) {
      fail(`service ${service.slug}.url must be an HTTPS xyh.wiki subdomain without an explicit port`);
    }
    slugs.add(service.slug);
    names.add(service.name);
    urls.add(service.url);
  }
}

validateData();
const categories = new Map(catalog.categories.map((category) => [category.id, category]));
const availability = new Map(Object.entries(catalog.availability));

function replace(template, variables) {
  const output = Object.entries(variables).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, String(value)),
    template
  );
  const unresolved = output.match(/{{[A-Z0-9_]+}}/g);
  if (unresolved) fail(`unresolved template variables: ${[...new Set(unresolved)].join(', ')}`);
  return output;
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
    ASSET_VERSION: assetVersion,
    JSON_LD: structuredData.map(jsonLd).join('\n'),
    PAGE_ID: escapeHtml(pageId),
    BODY: body
  });
}

function serviceRow(service) {
  const category = categories.get(service.category);
  const access = availability.get(service.availability);
  const search = [service.name, service.summary, ...service.features, ...service.keywords].join(' ');
  return `<article class="service-row" data-service-row data-category="${escapeHtml(service.category)}" data-search="${escapeHtml(search)}">
    <a class="service-row-link" href="/services/${escapeHtml(service.slug)}/">
      <span class="service-name">${escapeHtml(service.name)}</span>
      <span class="service-summary">${escapeHtml(service.summary)}</span>
      <span class="service-meta">
        <span>${escapeHtml(category.label)}</span>
        ${access.listLabel ? `<span class="service-access">${escapeHtml(access.listLabel)}</span>` : ''}
      </span>
      <span class="service-arrow" aria-hidden="true">→</span>
    </a>
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

const homeBody = replace(homeTemplate, {
  SERVICE_COUNT: services.length,
  CATEGORY_FILTERS: catalog.categories
    .map((category) => `<button type="button" class="filter" data-filter="${escapeHtml(category.id)}">${escapeHtml(category.filterLabel)}</button>`)
    .join('\n'),
  SERVICE_ROWS: services.map(serviceRow).join('\n')
});

await writeRoute('/', shell({
  title: `${site.siteName}｜在线工具与公开项目`,
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
      itemListElement: services.filter((item) => availability.get(item.availability).indexable).map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.name, url: `${siteUrl}/services/${item.slug}/`
      }))
    }
  ]
}));

const articles = {
  about: ['关于 xyh.wiki', '了解 xyh.wiki 收录的在线工具和公开项目，以及本站的内容范围、收录原则、项目说明方式与后续更新方法。'],
  guide: ['如何选择合适的工具', '按媒体转换、文本处理、开源阅读、文档问答和个人应用选择 xyh.wiki 中的项目，并了解使用前的注意事项。'],
  privacy: ['隐私政策', '了解访问 xyh.wiki 首页、使用本地搜索以及跳转到各个项目时涉及的数据处理方式、访问日志和隐私联系渠道。'],
  terms: ['使用条款', '查看 xyh.wiki 项目目录的合理使用规则、知识产权、外部链接、服务可用性、用户责任和内容变更说明。'],
  contact: ['联系方式', '反馈 xyh.wiki 项目入口、页面内容、隐私、版权或安全问题时可使用的联系方式、必要信息与安全注意事项。'],
  status: ['服务说明', '了解 xyh.wiki 中公开项目、演示项目和登录入口的含义，以及遇到访问问题时应提供的信息和反馈方式。']
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
  const category = categories.get(service.category);
  const access = availability.get(service.availability);
  const serviceDescription = `${service.summary}查看主要功能、适用场景、访问方式、界面语言和使用前建议。`;
  const body = replace(serviceTemplate, {
    SERVICE_NAME: escapeHtml(service.name),
    SERVICE_URL: escapeHtml(service.url),
    SERVICE_SUMMARY: escapeHtml(service.summary),
    CATEGORY_LABEL: escapeHtml(category.label),
    AVAILABILITY_LABEL: escapeHtml(access.label),
    AVAILABILITY_SUFFIX: access.listLabel ? ` · ${escapeHtml(access.label)}` : '',
    FEATURE_ITEMS: service.features.map((item) => `<li>${escapeHtml(item)}</li>`).join(''),
    BOUNDARY_TEXT: escapeHtml(access.boundary),
    GUIDANCE_TEXT: escapeHtml(service.guidance),
    LANGUAGE: escapeHtml(service.language)
  });
  await writeRoute(`/services/${service.slug}/`, shell({
    title: `${service.name}：${category.label}｜${site.siteName}`,
    description: serviceDescription,
    route: `/services/${service.slug}/`,
    pageId: 'service',
    robots: access.indexable ? 'index,follow' : 'noindex,follow',
    body,
    structuredData: [{
      '@context': 'https://schema.org', '@type': 'WebPage', name: service.name,
      url: `${siteUrl}/services/${service.slug}/`, description: serviceDescription,
      inLanguage: 'zh-CN', mainEntity: { '@type': 'WebApplication', name: service.name, url: service.url, applicationCategory: category.label }
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

const indexedRoutes = ['/', ...Object.keys(articles).map((slug) => `/${slug}/`), ...services.filter((item) => availability.get(item.availability).indexable).map((item) => `/services/${item.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedRoutes.map((route) => `  <url><loc>${escapeHtml(siteUrl + route)}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(path.join(dist, 'site.webmanifest'), JSON.stringify({
  name: site.siteName, short_name: 'xyh.wiki', start_url: '/', display: 'standalone',
  background_color: '#ffffff', theme_color: '#ffffff', icons: [{ src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
}, null, 2));
await writeFile(path.join(dist, 'site-config.json'), JSON.stringify({ siteUrl, updated: site.updated }, null, 2));

console.log(`Built ${indexedRoutes.length} indexable routes and ${services.length} service pages into ${dist}`);
