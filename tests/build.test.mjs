import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const services = JSON.parse(await readFile(path.join(root, 'data/services.json'), 'utf8'));
const catalog = JSON.parse(await readFile(path.join(root, 'data/catalog.json'), 'utf8'));
const articles = [
  'about', 'guide', 'privacy', 'terms', 'contact', 'status',
  'audio-local', 'json-cleaning', 'github-evaluation', 'browser-privacy'
];
const adEnabledArticles = ['audio-local', 'json-cleaning', 'github-evaluation', 'browser-privacy'];

const read = (relative) => readFile(path.join(dist, relative), 'utf8');
const one = (html, pattern) => [...html.matchAll(pattern)].length;

test('all expected pages are generated', async () => {
  await stat(path.join(dist, 'index.html'));
  for (const slug of articles) await stat(path.join(dist, slug, 'index.html'));
  for (const service of services) await stat(path.join(dist, 'services', service.slug, 'index.html'));
  await stat(path.join(dist, '404.html'));
});

test('catalog navigation is generated from category data', async () => {
  const home = await read('index.html');
  for (const category of catalog.categories) {
    assert.match(home, new RegExp(`data-filter="${category.id}"`));
    assert.match(home, new RegExp(`>${category.filterLabel}<`));
  }
  assert.equal(one(home, /data-service-row/g), services.length);
  assert.match(home, /\/assets\/styles\.css\?v=[a-f0-9]{12}/);
  assert.match(home, /\/assets\/site\.js\?v=[a-f0-9]{12}/);
});

test('homepage UI includes featured entries and accessible filtering controls', async () => {
  const home = await read('index.html');
  const featured = services.filter((item) => item.featured);
  assert.equal(one(home, /class="featured-row"/g), featured.length);
  assert.match(home, /class="nav-more-toggle"[^>]+aria-expanded="false"/);
  assert.match(home, /id="nav-more-menu"[^>]+hidden/);
  assert.match(home, /class="search-clear"[^>]+hidden/);
  assert.equal(one(home, /aria-pressed="true"/g), 1);
  assert.equal(one(home, /aria-pressed="false"/g), catalog.categories.length);
  assert.match(home, /data-privacy-settings/);
});

test('only substantive guide pages include the configured AdSense loader once', async () => {
  const htmlFiles = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(target);
      else if (entry.name.endsWith('.html')) htmlFiles.push(target);
    }
  }
  await collect(dist);
  for (const file of htmlFiles.filter((file) => adEnabledArticles.some((slug) => file.endsWith(`/${slug}/index.html`)))) {
    const html = await readFile(file, 'utf8');
    assert.equal(
      one(html, /https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8907413334960000/g),
      1,
      `${path.relative(dist, file)} must include one AdSense loader`
    );
    assert.match(html, /crossorigin="anonymous"/);
  }
  for (const file of htmlFiles.filter((file) => !file.endsWith('/404.html') && !adEnabledArticles.some((slug) => file.endsWith(`/${slug}/index.html`)))) {
    const html = await readFile(file, 'utf8');
    assert.doesNotMatch(html, /adsbygoogle\.js/, `${path.relative(dist, file)} must not load AdSense on thin or directory pages`);
  }
  assert.doesNotMatch(await read('404.html'), /adsbygoogle\.js/);
});

test('indexable pages have unique metadata, canonical, one h1 and visible body', async () => {
  const routes = ['index.html', ...articles.map((slug) => `${slug}/index.html`), ...services.filter((item) => catalog.availability[item.availability].indexable).map((item) => `services/${item.slug}/index.html`)];
  const titles = new Set();
  const descriptions = new Set();
  for (const route of routes) {
    const html = await read(route);
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    const description = html.match(/<meta name="description" content="(.*?)">/s)?.[1];
    assert.ok(title && !titles.has(title), `unique title for ${route}`);
    assert.ok(description && description.length >= 50 && !descriptions.has(description), `unique useful description for ${route}`);
    titles.add(title); descriptions.add(description);
    assert.equal(one(html, /<h1(?:\s|>)/g), 1, `one h1 for ${route}`);
    assert.equal(one(html, /<link rel="canonical"/g), 1, `canonical for ${route}`);
    assert.match(html, /<main[\s>]/, `semantic main for ${route}`);
    assert.match(html, /application\/ld\+json/, `JSON-LD for ${route}`);
  }
});

test('guide pages provide substantive article markup and internal links', async () => {
  for (const slug of adEnabledArticles) {
    const html = await read(`${slug}/index.html`);
    assert.match(html, /<meta name="robots" content="index,follow">/);
    assert.match(html, /<meta property="og:type" content="article">/);
    assert.match(html, /<p class="article-meta">原创实践指南 · 更新于 2026-08-31<\/p>/);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"dateModified":"2026-08-31"/);
    assert.match(html, /href="\/services\/[^"]+\/"/);
    assert.ok(html.replace(/<[^>]+>/g, '').length > 900, `${slug} should contain more than a short template description`);
  }
});

test('non-indexable service detail pages are noindex and excluded from sitemap', async () => {
  const sitemap = await read('sitemap.xml');
  for (const service of services.filter((item) => !catalog.availability[item.availability].indexable)) {
    const html = await read(`services/${service.slug}/index.html`);
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.ok(!sitemap.includes(`/services/${service.slug}/`));
  }
});

test('service detail pages expose audience and concrete usage steps', async () => {
  for (const service of services) {
    const html = await read(`services/${service.slug}/index.html`);
    assert.match(html, /<h2>适合谁<\/h2>/);
    assert.match(html, /<h2>如何开始<\/h2>/);
    assert.equal(one(html, /<ol class="feature-list">/g), 1);
    for (const step of service.steps) assert.match(html, new RegExp(step.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('service catalog uses safe https URLs and contains no internal ports', async () => {
  for (const service of services) {
    const url = new URL(service.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.port, '');
    assert.match(url.hostname, /\.xyh\.wiki$/);
  }
  const home = await read('index.html');
  assert.ok(!/169\.58\.|66\.154\.|127\.0\.0\.1|localhost/.test(home));
});

test('public output contains no deployment details or unpublished business plans', async () => {
  const htmlFiles = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(target);
      else if (entry.name.endsWith('.html')) htmlFiles.push(target);
    }
  }
  await collect(dist);
  const forbidden = [
    /xyh-dep/i,
    /miles-01/i,
    /广告预留/,
    /ADSENSE_/,
    /publisher ID/i,
    /运行节点/,
    /维护节点/,
    /核对日期/
  ];
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(html, pattern, `${path.relative(dist, file)} must not expose ${pattern}`);
    for (const host of new Set(services.map((service) => service.host))) {
      assert.ok(!html.includes(host), `${path.relative(dist, file)} must not expose deployment host ${host}`);
    }
  }
  assert.equal(await read('ads.txt'), 'google.com, pub-8907413334960000, DIRECT, f08c47fec0942fa0\n');
  await assert.rejects(stat(path.join(dist, 'ads.txt.example')));
  await assert.rejects(stat(path.join(dist, 'advertising')));
});

test('robots and sitemap reference the production origin', async () => {
  assert.match(await read('robots.txt'), /Sitemap: https:\/\/xyh\.wiki\/sitemap\.xml/);
  const sitemap = await read('sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/xyh\.wiki\/<\/loc>/);
  assert.ok(!sitemap.includes('localhost'));
});
