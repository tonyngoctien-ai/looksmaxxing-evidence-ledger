// Citation verifier. A site whose whole pitch is "evidence-led" must be able to
// prove its citations resolve — and, for PubMed IDs, that the paper we cite is
// the paper that actually sits at that ID. Misattribution is the failure mode a
// plain link-checker misses, so we fetch the real title and print it for review.

import { readFileSync } from 'node:fs';

const claims = JSON.parse(readFileSync('data/claims.json', 'utf8'));
const pmidOf = url => (url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/) || [])[1];

const rows = [];
for (const c of claims) {
  for (const e of c.evidence) rows.push({ claim: c.id, source: e.source, url: e.url, pmid: pmidOf(e.url) });
}

const pmids = [...new Set(rows.map(r => r.pmid).filter(Boolean))];
let titles = {};
if (pmids.length) {
  const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmids.join(',')}`);
  const json = await res.json();
  for (const id of pmids) {
    const r = json.result?.[id];
    titles[id] = r?.error ? null : `${r?.title || ''} — ${(r?.source) || ''} ${(r?.pubdate || '').slice(0,4)}`;
  }
}

let bad = 0;
for (const r of rows) {
  if (r.pmid) {
    const t = titles[r.pmid];
    if (!t) { bad++; console.log(`✗ DEAD PMID ${r.pmid}  (${r.claim})`); continue; }
    console.log(`• ${r.claim}\n    we cite : ${r.source}\n    pubmed  : ${t}`);
  } else {
    const ok = await fetch(r.url, { method: 'HEAD' }).then(x => x.ok).catch(() => false);
    if (!ok) { bad++; console.log(`✗ UNREACHABLE ${r.url}  (${r.claim})`); }
    else console.log(`• ${r.claim}\n    search  : ${r.url.split('term=')[1] || r.url}`);
  }
}
console.log(bad ? `\n${bad} citation problem(s) — review before shipping.` : `\nAll ${rows.length} citations resolve. Titles above still need a human eye.`);
