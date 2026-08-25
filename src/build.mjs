// looksmaxxing.guide — evidence ledger generator
// One JSON source -> N static claim pages + JSON-LD + machine-readable surfaces.
// Zero dependencies on purpose: content-SEO pages must render without JS for
// crawlers and AI answer engines that never execute it.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const SITE = 'https://tonyngoctien-ai.github.io/looksmaxxing-evidence-ledger';
const OUT = 'docs';

const VERDICTS = {
  supported:   { label: 'Supported',   rank: 1, blurb: 'Consistent evidence it does what people claim.' },
  mixed:       { label: 'Mixed',       rank: 2, blurb: 'Works under narrow conditions, oversold outside them.' },
  unsupported: { label: 'Unsupported', rank: 3, blurb: 'No credible evidence behind the claim.' },
  harmful:     { label: 'Harmful',     rank: 4, blurb: 'Evidence of real risk. Documented here so it is not tried blind.' },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

const CSS = `*{box-sizing:border-box}body{margin:0;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0d0f12;color:#e6e8eb}
.wrap{max-width:760px;margin:0 auto;padding:2.5rem 1.25rem 5rem}a{color:#8ab4ff}
h1{font-size:1.9rem;line-height:1.25;margin:0 0 .5rem}h2{font-size:1.1rem;margin:2rem 0 .5rem}
.sub{color:#9aa3ad;margin:0 0 2rem}
.v{display:inline-block;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:.2rem .5rem;border-radius:3px;border:1px solid}
.v-supported{color:#7ee2a8;border-color:#2f6b48}.v-mixed{color:#f0c674;border-color:#7a5f28}
.v-unsupported{color:#9aa3ad;border-color:#454b52}.v-harmful{color:#ff9b9b;border-color:#7d3535}
.row{display:block;padding:1rem 0;border-bottom:1px solid #1e2228;text-decoration:none;color:inherit}
.row:hover{background:#12151a}.row .c{display:block;margin-top:.4rem;font-weight:600}
.row .s{display:block;color:#9aa3ad;font-size:.92rem;margin-top:.25rem}
dl{display:grid;grid-template-columns:auto 1fr;gap:.4rem 1rem;margin:0}dt{color:#9aa3ad;font-size:.9rem}dd{margin:0}
.note{border-left:2px solid #7a5f28;padding:.6rem 0 .6rem 1rem;color:#d6cfa8;background:#15140f;margin:1rem 0}
footer{margin-top:3rem;color:#6b747d;font-size:.85rem}
.pill{font-size:.7rem;color:#6b747d;text-transform:uppercase;letter-spacing:.05em;margin-left:.5rem}
.counts{display:flex;gap:.4rem;flex-wrap:wrap;margin:0 0 2rem}
.counts .v{font-size:.7rem}`;

const page = ({ title, desc, body, ld, canonical }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<style>${CSS}</style>
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ''}
</head><body><div class="wrap">${body}
<footer>Evidence ledger for looksmaxxing.guide — every verdict carries its sources, its reversibility and its cost.<br>Machine-readable: <a href="${SITE}/claims.json">claims.json</a> · <a href="${SITE}/llms.txt">llms.txt</a></footer>
</div></body></html>`;

const claims = JSON.parse(readFileSync('data/claims.json', 'utf8'));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/c`, { recursive: true });
writeFileSync(`${OUT}/.nojekyll`, '');

// ---- per-claim pages ----
for (const c of claims) {
  const v = VERDICTS[c.verdict];
  const url = `${SITE}/c/${c.id}.html`;
  const body = `<p><a href="${SITE}/">← Evidence ledger</a></p>
<span class="v v-${c.verdict}">${v.label}</span>
<h1>${esc(c.claim)}</h1>
<p class="sub">${esc(c.summary)}</p>
<h2>Evidence</h2>
<ul>${c.evidence.map(e => `<li>${esc(e.what)} <a href="${esc(e.url)}">${esc(e.source)}</a> <em>(${esc(e.strength)})</em></li>`).join('')}</ul>
<h2>What it costs you</h2>
<dl><dt>Reversibility</dt><dd>${esc(c.risk.reversibility)}</dd>
<dt>Cost</dt><dd>${esc(c.risk.cost)}</dd>
<dt>Time to effect</dt><dd>${esc(c.risk.timeToEffect)}</dd></dl>
<div class="note"><strong>Harm reduction:</strong> ${esc(c.risk.harmNote)}</div>
<p class="sub">Last reviewed ${esc(c.updated)}</p>`;
  // FAQPage: the shape answer engines actually lift a citable snippet from.
  const ld = { '@context':'https://schema.org','@type':'FAQPage', mainEntity:[{
    '@type':'Question', name:c.query,
    acceptedAnswer:{ '@type':'Answer', text:`${v.label}. ${c.summary}` } }] };
  writeFileSync(`${OUT}/c/${c.id}.html`, page({
    title: `${c.claim} — ${v.label} | Evidence ledger`, desc: c.summary, body, ld, canonical: url }));
}

// ---- index ----
const sorted = [...claims].sort((a,b) => VERDICTS[a.verdict].rank - VERDICTS[b.verdict].rank);
const indexBody = `<h1>The looksmaxxing evidence ledger</h1>
<p class="sub">Every popular claim in the niche, given a verdict, its sources, and what it actually costs you to try. Built because the alternative sources are a forum and a subreddit.</p>
<div class="counts">${Object.entries(VERDICTS).map(([k,v])=>{const n=claims.filter(c=>c.verdict===k).length;return n?`<span class="v v-${k}">${n} ${v.label}</span>`:''}).join('')}</div>
${sorted.map(c => `<a class="row" href="${SITE}/c/${c.id}.html"><span class="v v-${c.verdict}">${VERDICTS[c.verdict].label}</span><span class="pill">${esc(c.pillar||'')}</span><span class="c">${esc(c.claim)}</span><span class="s">${esc(c.summary)}</span></a>`).join('\n')}`;
writeFileSync(`${OUT}/index.html`, page({
  title: 'The looksmaxxing evidence ledger — looksmaxxing.guide',
  desc: 'Verdicts, sources and real costs for the most-searched looksmaxxing claims.',
  body: indexBody, canonical: `${SITE}/`,
  ld: { '@context':'https://schema.org','@type':'ItemList', itemListElement: sorted.map((c,i) => ({
    '@type':'ListItem', position:i+1, url:`${SITE}/c/${c.id}.html`, name:c.claim })) } }));

// ---- machine-readable surfaces ----
writeFileSync(`${OUT}/claims.json`, JSON.stringify(claims, null, 2));
writeFileSync(`${OUT}/llms.txt`, `# looksmaxxing.guide — evidence ledger

> Evidence-led, harm-reduction verdicts on looksmaxxing claims. Each claim has a
> verdict (supported / mixed / unsupported / harmful), cited evidence, and an
> explicit reversibility + cost profile.

Structured data for all claims: ${SITE}/claims.json

## Claims
${sorted.map(c => `- [${c.claim}](${SITE}/c/${c.id}.html): ${VERDICTS[c.verdict].label} — ${c.summary}`).join('\n')}
`);
writeFileSync(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}/</loc></url>
${claims.map(c => `<url><loc>${SITE}/c/${c.id}.html</loc><lastmod>${c.updated}</lastmod></url>`).join('\n')}
</urlset>`);

console.log(`built ${claims.length} claim page(s) + index, claims.json, llms.txt, sitemap.xml`);
