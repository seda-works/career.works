#!/usr/bin/env node
// Takeda (jobs.takeda.com, Radancy/TalentBrew) local parser for scan.mjs.
//
// Why a local parser: the built-in radancy provider doesn't read the location
// on Takeda's legacy markup (<span class="location"> inside the job anchor), so
// every posting arrived with an empty location and slipped past location_filter.
//
// Pulls every posting in one request from Radancy's results endpoint
// (RecordsPerPage=1000) and prints jobs-json-v1: [{ title, url, location }].
// A bare "Remote" location carries no country, so it is replaced with the city
// slug from the job URL (e.g. /job/changshu-city/... -> "Changshu City (home-based)")
// to let location_filter judge it by city instead of passing every remote role.

const ORIGIN = 'https://jobs.takeda.com';
const RESULTS_URL = `${ORIGIN}/search-jobs/results?ActiveFacetID=0&CurrentPage=1&RecordsPerPage=1000`
  + '&Distance=50&RadiusUnitType=0&Keywords=&Location=&ShowRadius=False&IsPagination=False&FacetType=0'
  + '&SearchResultsModuleName=Search+Results&SearchFiltersModuleName=Search+Filters'
  + '&SortCriteria=0&SortDirection=0&SearchType=5';

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function cityFromPath(path) {
  const slug = path.split('/')[2] || '';
  return slug.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

const res = await fetch(RESULTS_URL, {
  headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
  signal: AbortSignal.timeout(80_000),
});
if (!res.ok) throw new Error(`Takeda results HTTP ${res.status}`);
const html = (await res.json()).results || '';

const jobs = [];
const anchorRe = /<a href="(\/job\/[^"]+)"[^>]*data-job-id="\d+"[^>]*>([\s\S]*?)<\/a>/g;
for (const [, path, body] of html.matchAll(anchorRe)) {
  const title = decodeEntities((body.match(/<h2 class="title">([\s\S]*?)<\/h2>/) || [])[1] || '');
  if (!title) continue;
  let location = decodeEntities((body.match(/<span class="location">([\s\S]*?)<\/span>/) || [])[1] || '');
  if (!location || /^remote$/i.test(location)) {
    const city = cityFromPath(path);
    location = city ? `${city} (home-based)` : '';
  }
  jobs.push({ title, url: ORIGIN + path, location });
}

process.stdout.write(JSON.stringify(jobs));
