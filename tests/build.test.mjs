import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const services = JSON.parse(await readFile(path.join(root, 'data/services.json'), 'utf8'));
const articles = ['about', 'guide', 'privacy', 'terms', 'advertising', 'contact', 'status'];

const read = (relative) => readFile(path.join(dist, relative), 'utf8');
const one = (html, pattern) => [...html.matchAll(pattern)].length;

test('all expected pages are generated', async () => {
  await stat(path.join(dist, 'index.html'));
  for (const slug of articles) await stat(path.join(dist, slug, 'index.html'));
  for (const service of services) await stat(path.join(dist, 'services', service.slug, 'index.html'));
  await stat(path.join(dist, '404.html'));
});

test('indexable pages have unique metadata, canonical, one h1 and visible body', async () => {
  const routes = ['index.html', ...articles.map((slug) => `${slug}/index.html`), ...services.filter((item) => item.availability !== 'private').map((item) => `services/${item.slug}/index.html`)];
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

test('private service detail pages are noindex and excluded from sitemap', async () => {
  const sitemap = await read('sitemap.xml');
  for (const service of services.filter((item) => item.availability === 'private')) {
    const html = await read(`services/${service.slug}/index.html`);
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.ok(!sitemap.includes(`/services/${service.slug}/`));
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

test('ads are opt-in and placeholder publisher id is not published', async () => {
  const home = await read('index.html');
  assert.ok(!home.includes('pagead2.googlesyndication.com'));
  await assert.rejects(stat(path.join(dist, 'ads.txt')));
  const example = await read('ads.txt.example');
  assert.match(example, /REPLACE_WITH_REAL_PUBLISHER_ID/);
});

test('robots and sitemap reference the production origin', async () => {
  assert.match(await read('robots.txt'), /Sitemap: https:\/\/xyh\.wiki\/sitemap\.xml/);
  const sitemap = await read('sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/xyh\.wiki\/<\/loc>/);
  assert.ok(!sitemap.includes('localhost'));
});
