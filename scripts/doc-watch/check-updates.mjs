#!/usr/bin/env node
/**
 * doc-watch — 每日抓取上游文档站，与本地基线快照对比，报告新增内容与图片。
 *
 * 上游源：
 *   - Loomy Docs   (VitePress SSG，侧边栏即页面清单)
 *   - AstronClaw 使用指南 (xfyun.cn，单页 SSR)
 *
 * 用法：
 *   node scripts/doc-watch/check-updates.mjs            # 抓取并与基线对比，有变化则退出码 1
 *   node scripts/doc-watch/check-updates.mjs --json      # 额外输出 JSON 报告到 stdout
 *   node scripts/doc-watch/check-updates.mjs --report f  # 把 Markdown 报告写到文件 f
 *   node scripts/doc-watch/check-updates.mjs --update     # 把当前抓取结果写回基线（接受现状）
 *   node scripts/doc-watch/check-updates.mjs --init       # 首次创建基线
 *
 * 仅依赖 Node 内置能力（fetch + fs），无第三方依赖。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = path.join(__dirname, 'baseline');

const SOURCES = [
  {
    id: 'loomy',
    name: 'Loomy Docs',
    type: 'vitepress',
    origin: 'https://loomy.xunfei.cn',
    index: 'https://loomy.xunfei.cn/docs',
  },
  {
    id: 'astronclaw',
    name: 'AstronClaw 使用指南',
    type: 'single',
    origin: 'https://www.xfyun.cn',
    pages: [
      'https://www.xfyun.cn/doc/spark/Agent-AstronClaw%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97.html',
    ],
  },
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) doc-watch/1.0';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ---------- HTML helpers (regex-based, no deps) ----------

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[​-‍﻿]/g, ''); // zero-width chars (VitePress anchors)
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function absolutize(src, origin) {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return origin + src;
  return origin + '/' + src;
}

// Grab the main article region so we don't diff against nav/footer chrome.
function extractMain(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  const vpdoc = html.match(/<div class="vp-doc[\s\S]*?<\/main>/i);
  if (vpdoc) return vpdoc[0];
  // xfyun / generic: try common content containers, else fall back to <body>.
  for (const re of [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*(?:doc-content|markdown-body|article|content-detail)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  ]) {
    const m = html.match(re);
    if (m) return m[1];
  }
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : html;
}

function extractHeadings(contentHtml) {
  const out = [];
  const re = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(contentHtml))) {
    // Drop VitePress header-anchor links before flattening to text.
    const inner = m[2].replace(/<a\b[^>]*class="[^"]*header-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    const text = stripTags(inner).trim();
    if (text) out.push(`h${m[1]}:${text}`);
  }
  return out;
}

function extractImages(contentHtml, origin) {
  const out = new Set();
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(contentHtml))) {
    const src = absolutize(m[1], origin);
    // Skip ubiquitous logo/avatar chrome so it isn't flagged as "content".
    if (/loomy-avatar\.png$/i.test(src)) continue;
    out.add(src);
  }
  return [...out];
}

// VitePress sidebar carries the full page list. Pull /docs/* hrefs.
function extractSidebarLinks(html, origin, indexUrl) {
  const links = new Set();
  const re = /<a\b[^>]*class="[^"]*VPLink[^"]*"[^>]*href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (!href.startsWith('/docs')) continue;
    href = href.replace(/#.*$/, '').replace(/\/$/, '');
    links.add(absolutize(href, origin));
  }
  links.add(indexUrl.replace(/\/$/, ''));
  return [...links].sort();
}

// ---------- per-source capture ----------

async function capturePage(url, origin) {
  const html = await fetchText(url);
  const titleM = html.match(/<title>([^<]*)<\/title>/i);
  const main = extractMain(html);
  const text = stripTags(main);
  return {
    url,
    title: titleM ? decodeEntities(titleM[1]).trim() : url,
    headings: extractHeadings(main),
    images: extractImages(main, origin),
    textHash: hash(text),
    textLen: text.length,
  };
}

async function captureSource(src) {
  let pageUrls;
  if (src.type === 'vitepress') {
    const indexHtml = await fetchText(src.index);
    pageUrls = extractSidebarLinks(indexHtml, src.origin, src.index);
  } else {
    pageUrls = src.pages;
  }

  const pages = {};
  for (const url of pageUrls) {
    try {
      pages[url] = await capturePage(url, src.origin);
    } catch (e) {
      pages[url] = { url, error: String(e.message || e) };
    }
  }
  return { source: src.id, name: src.name, pageCount: Object.keys(pages).length, pages };
}

// ---------- diff ----------

function diffSource(oldSnap, newSnap) {
  const changes = { newPages: [], removedPages: [], changedPages: [], errors: [] };
  const oldPages = (oldSnap && oldSnap.pages) || {};
  const newPages = newSnap.pages;

  for (const [url, p] of Object.entries(newPages)) {
    if (p.error) {
      changes.errors.push({ url, error: p.error });
      continue;
    }
    const prev = oldPages[url];
    if (!prev) {
      changes.newPages.push({ url, title: p.title, headings: p.headings, images: p.images });
      continue;
    }
    const oldHeads = new Set(prev.headings || []);
    const oldImgs = new Set(prev.images || []);
    const newHeads = (p.headings || []).filter((h) => !oldHeads.has(h));
    const newImgs = (p.images || []).filter((i) => !oldImgs.has(i));
    const textChanged = prev.textHash !== p.textHash;
    if (newHeads.length || newImgs.length || textChanged) {
      changes.changedPages.push({
        url,
        title: p.title,
        newHeadings: newHeads,
        newImages: newImgs,
        textChanged,
        textLenDelta: p.textLen - (prev.textLen || 0),
      });
    }
  }
  for (const url of Object.keys(oldPages)) {
    if (!newPages[url]) changes.removedPages.push(url);
  }
  return changes;
}

function hasChanges(c) {
  return c.newPages.length || c.removedPages.length || c.changedPages.length;
}

// ---------- report ----------

function renderReport(results) {
  const lines = [];
  lines.push('# 文档更新巡检报告', '');
  let any = false;
  for (const r of results) {
    lines.push(`## ${r.name}  \`(${r.source})\``, '');
    const c = r.changes;
    if (c.errors.length) {
      lines.push('> ⚠️ 抓取异常：');
      for (const e of c.errors) lines.push(`> - ${e.url} — ${e.error}`);
      lines.push('');
    }
    if (!hasChanges(c)) {
      lines.push('_无新增内容。_', '');
      continue;
    }
    any = true;
    if (c.newPages.length) {
      lines.push('### 🆕 新增页面');
      for (const p of c.newPages) {
        lines.push(`- **${p.title}** — ${p.url}`);
        if (p.headings?.length) lines.push(`  - 小节：${p.headings.map((h) => h.split(':').slice(1).join(':')).join(' / ')}`);
        if (p.images?.length) {
          lines.push(`  - 图片（${p.images.length}）：`);
          for (const im of p.images) lines.push(`    - ${im}`);
        }
      }
      lines.push('');
    }
    if (c.changedPages.length) {
      lines.push('### ✏️ 内容变化的页面');
      for (const p of c.changedPages) {
        lines.push(`- **${p.title}** — ${p.url}（正文字数变化 ${p.textLenDelta >= 0 ? '+' : ''}${p.textLenDelta}）`);
        if (p.newHeadings.length)
          lines.push(`  - 新增小节：${p.newHeadings.map((h) => h.split(':').slice(1).join(':')).join(' / ')}`);
        if (p.newImages.length) {
          lines.push(`  - 新增图片（${p.newImages.length}）：`);
          for (const im of p.newImages) lines.push(`    - ${im}`);
        }
      }
      lines.push('');
    }
    if (c.removedPages.length) {
      lines.push('### 🗑️ 下线/改名的页面');
      for (const u of c.removedPages) lines.push(`- ${u}`);
      lines.push('');
    }
  }
  if (!any) lines.push('---', '', '✅ 两个文档源均无新增内容。');
  return lines.join('\n');
}

// ---------- main ----------

function baselinePath(id) {
  return path.join(BASELINE_DIR, `${id}.json`);
}
function readBaseline(id) {
  const p = baselinePath(id);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
}
function writeBaseline(id, snap) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  fs.writeFileSync(baselinePath(id), JSON.stringify(snap, null, 2) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const isInit = args.includes('--init');
  const isUpdate = args.includes('--update');
  const wantJson = args.includes('--json');
  const reportIdx = args.indexOf('--report');
  const reportFile = reportIdx >= 0 ? args[reportIdx + 1] : null;

  const results = [];
  for (const src of SOURCES) {
    process.stderr.write(`[doc-watch] capturing ${src.name} …\n`);
    const snap = await captureSource(src);
    const baseline = readBaseline(src.id);
    const changes = diffSource(baseline, snap);
    results.push({ source: src.id, name: src.name, snap, changes });

    if (isInit || isUpdate) writeBaseline(src.id, snap);
  }

  const report = renderReport(results);
  if (reportFile) fs.writeFileSync(reportFile, report + '\n');
  if (wantJson) {
    process.stdout.write(JSON.stringify(results.map((r) => ({ source: r.source, changes: r.changes })), null, 2) + '\n');
  } else {
    process.stdout.write(report + '\n');
  }

  if (isInit) {
    process.stderr.write('[doc-watch] baseline initialized.\n');
    process.exit(0);
  }
  if (isUpdate) {
    process.stderr.write('[doc-watch] baseline updated to current state.\n');
    process.exit(0);
  }
  const changed = results.some((r) => hasChanges(r.changes));
  process.exit(changed ? 1 : 0);
}

main().catch((e) => {
  process.stderr.write(`[doc-watch] fatal: ${e.stack || e}\n`);
  process.exit(2);
});
