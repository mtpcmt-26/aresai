import { XMLParser } from 'npm:fast-xml-parser@4.5.3';
import { parse } from 'npm:node-html-parser@7.0.1';

export interface WebSource { url: string; title: string; description: string; content: string; date?: string; image?: string }
export const creditExhausted = (status: number, body: string) =>
  status === 402 || (status === 403 && /credit limit reached/i.test(body));

const strip = (s: string) => parse(s).textContent.trim();
export function rssSources(xml: string): WebSource[] {
  const items = new XMLParser().parse(xml)?.rss?.channel?.item ?? [];
  return (Array.isArray(items) ? items : [items]).flatMap((item) => {
    if (typeof item.link !== 'string' || !/^https?:\/\//.test(item.link)) return [];
    return [{ url: item.link, title: String(item.title ?? ''), description: strip(String(item.description ?? '')).slice(0, 400), content: '', date: item.pubDate }];
  });
}
export function duckSources(html: string): WebSource[] {
  return parse(html).querySelectorAll('.result').flatMap(item => {
    const a = item.querySelector('.result__a');
    const href = a?.getAttribute('href');
    if (!href) return [];
    let url: string;
    try { const u = new URL(href, 'https://duckduckgo.com'); url = u.searchParams.get('uddg') ?? u.href; } catch { return []; }
    if (!/^https?:\/\//.test(url) || new URL(url).hostname.endsWith('duckduckgo.com')) return [];
    return [{ url, title: a?.textContent ?? url, description: item.querySelector('.result__snippet')?.textContent.slice(0, 400) ?? '', content: '' }];
  });
}

async function backup(query: string, focus: string, limit: number): Promise<WebSource[]> {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; AresSearch/1.0)' };
  const news = async () => {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, { headers });
    if (!res.ok) throw new Error(`Google News backup failed [${res.status}]`);
    return rssSources(await res.text());
  };
  if (focus === 'news') return (await news()).slice(0, limit);
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers });
  if (!res.ok) throw new Error(`DuckDuckGo backup failed [${res.status}]`);
  const results = duckSources(await res.text());
  const merged = focus === 'all' || focus === 'finance' ? [...results, ...await news()] : results;
  return merged.filter((s, i, arr) => arr.findIndex(a => a.url === s.url) === i).slice(0, limit);
}

export async function verifiedSearch(query: string, key: string, focus: string, limit: number, scrape: boolean, onBackup?: () => void): Promise<WebSource[]> {
  const body: Record<string, unknown> = { query, limit };
  if (focus === 'news') { body.sources = ['news', 'web']; body.tbs = 'qdr:w'; }
  if (scrape) body.scrapeOptions = { formats: ['markdown'], onlyMainContent: true };
  // This project's linked Firecrawl connection uses direct API transport.
  const res = await fetch('https://api.firecrawl.dev/v2/search', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const details = await res.text();
    if (creditExhausted(res.status, details)) { onBackup?.(); return backup(query, focus, limit); }
    console.error('Firecrawl failure', res.status, details);
    throw new Error(`Firecrawl verification failed [${res.status}]. No backup was used.`);
  }
  const data = await res.json();
  if (data.success === false) throw new Error('Firecrawl verification failed. No backup was used.');
  const list = [...(data.data?.web ?? []), ...(data.data?.news ?? []), ...(Array.isArray(data.data) ? data.data : [])];
  return list.filter((s: { url?: unknown }) => typeof s.url === 'string' && /^https?:\/\//.test(s.url)).map((s: {url: string; title?: string; description?: string; snippet?: string; markdown?: string; date?: string; imageUrl?: string}) => ({ url: s.url, title: s.title ?? s.url, description: (s.description ?? s.snippet ?? '').slice(0, 400), content: (s.markdown ?? '').replace(/\s+/g, ' ').slice(0, scrape ? 2500 : 0), date: s.date, image: s.imageUrl }));
}