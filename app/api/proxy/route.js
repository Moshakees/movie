import { NextResponse } from 'next/server';

// Disable TLS verification to bypass UNABLE_TO_VERIFY_LEAF_SIGNATURE error for CDN links
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Mocking PHP file execution in JS if necessary, but here we can just implement the same logic
// or better, since this is a Next.js environment, we can use the logic directly.

const AK_BASE_URL = 'https://ak.sv';

async function akFetch(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    },
    next: { revalidate: 3600 }
  });
  return res.text();
}

function cleanUrl(url) {
  return url ? url.replace(/\\/g, '') : '';
}

function cleanText(text) {
  if (!text) return '';
  let t = text.replace(/<[^>]*>/g, '');
  t = t.replace(/مشاهدة و تحميل (فيلم|مسلسل) [^ ]+ حيث يدور العمل حول/g, '');
  t = t.replace(/مشاهدة و تحميل (فيلم|مسلسل) [^ ]+ يدور العمل حول/g, '');
  t = t.replace(/[\r\n\t]|&nbsp;/g, ' ');
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function parseList(html) {
  const results = [];
  const blocks = html.match(/<div class="entry-image">(.*?)<\/h3>/gs) || [];

  for (const block of blocks) {
    const linkMatch = block.match(/href="(https:\/\/ak\.sv\/(movie|series|show|mix)\/.*?)"/);
    if (linkMatch) {
      const link = cleanUrl(linkMatch[1]);
      const type = linkMatch[2];

      let image = '';
      const imgMatch1 = block.match(/xlink:href="(.*?)"/);
      const imgMatch2 = block.match(/<img src="(.*?)"/);
      if (imgMatch1) image = imgMatch1[1];
      else if (imgMatch2) image = imgMatch2[1];

      let title = '';
      const titleMatch = block.match(/alt="(.*?)"/);
      if (titleMatch) title = cleanText(titleMatch[1]);

      if (link && title) {
        results.push({ title, url: link, type, poster: image });
      }
    }
  }
  return results;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // ── Featured Section (المميزة) ────────────────────────────────────────
    if (action === 'featured') {
      const html = await akFetch(`${AK_BASE_URL}/main`);
      const results = [];

      const sectionMatch = html.match(/المميزة.*?<div class="widget-body"[^>]*>(.*?)<header/s);
      if (sectionMatch) {
        const content = sectionMatch[1];
        const blockRegex = /<div class="entry-box[^>]*>(.*?)<\/h3>/gs;
        let block;
        while ((block = blockRegex.exec(content)) !== null) {
          const linkMatch = block[1].match(/href="(https:\/\/ak\.sv\/(movie|series|show|mix)\/.*?)"/);
          if (linkMatch) {
            const link = cleanUrl(linkMatch[1]);
            const type = linkMatch[2];
            const imgMatch = block[1].match(/data-src="(.*?)"/) || block[1].match(/<img src="(.*?)"/);
            const image = imgMatch ? imgMatch[1] : '';
            const titleMatch = block[1].match(/class="text-white">(.*?)<\/a>/);
            const title = titleMatch ? cleanText(titleMatch[1]) : '';
            if (link && title) results.push({ title, url: link, type, poster: image });
          }
        }
      }
      return NextResponse.json({ count: results.length, results, status: 'success' });
    }

    // ── Latest Home ───────────────────────────────────────────────────────
    if (action === 'latest') {
      const html = await akFetch(`${AK_BASE_URL}/main`);
      const sections = [];
      const sectionRegex = /<h2 class="header-title[^>]*>(.*?)<\/h2>.*?<div class="row">(.*?)<\/div>/gs;
      let secMatch;
      while ((secMatch = sectionRegex.exec(html)) !== null) {
        const sectionTitle = cleanText(secMatch[1]);
        if (!sectionTitle || sectionTitle === 'المميزة') continue;
        const items = parseList(secMatch[2]);
        if (items.length > 0) sections.push({ section_title: sectionTitle, items });
      }
      return NextResponse.json({ sections, status: 'success' });
    }

    if (action === 'categories') {
      const sections = ['movies', 'series', 'shows', 'mix'];
      const data = {};

      for (const section of sections) {
        const html = await akFetch(`${AK_BASE_URL}/${section}`);
        const filters = {};
        const filterNames = ['section', 'category', 'quality', 'language', 'year'];
        const labels = {
          section: 'الأقسام الفرعية',
          category: 'التصنيفات',
          quality: 'الجودة',
          language: 'اللغة',
          year: 'سنة الإنتاج'
        };

        for (const f of filterNames) {
          const selectRegex = new RegExp(`<select[^>]*name="${f}"[^>]*>(.*?)<\\/select>`, 's');
          const selectMatch = html.match(selectRegex);
          if (selectMatch) {
            const items = [];
            const optionRegex = /<option[^>]*value="([^"]+)"[^>]*>(.*?)<\/option>/gs;
            let optionMatch;
            while ((optionMatch = optionRegex.exec(selectMatch[1])) !== null) {
              const id = optionMatch[1];
              const name = cleanText(optionMatch[2]);
              if (id !== "0" && name) items.push({ id, name });
            }
            if (items.length > 0) {
              filters[f] = { label: labels[f], items };
            }
          }
        }
        data[section] = { filters };
      }
      return NextResponse.json({ status: 'success', data });
    }

    if (action === 'category_content') {
      const type = searchParams.get('type') || 'movies';
      const page = searchParams.get('page') || '1';
      const section = searchParams.get('section');
      const category = searchParams.get('category');

      let url = `${AK_BASE_URL}/${type}?page=${page}`;
      if (section) url += `&section=${section}`;
      if (category) url += `&category=${category}`;

      const html = await akFetch(url);
      const results = parseList(html);

      return NextResponse.json({
        status: 'success',
        type,
        results,
        count: results.length
      });
    }

    if (action === 'search') {
      const q = searchParams.get('q');
      const html = await akFetch(`${AK_BASE_URL}/search?q=${encodeURIComponent(q)}`);
      const results = parseList(html);
      return NextResponse.json({ status: 'success', query: q, results, count: results.length });
    }

    if (action === 'details') {
      const url = searchParams.get('url');
      const html = await akFetch(url);

      const data = { url: cleanUrl(url), status: 'success', story: 'غير متوفر' };

      const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
      if (titleMatch) data.title = cleanText(titleMatch[1]);

      const posterMatch = html.match(/xlink:href="(.*?)"/);
      if (posterMatch) data.poster = posterMatch[1];

      const isEpisode = url.includes('/episode/');
      let mainPageHtml = html;

      if (isEpisode) {
        const parentMatch = html.match(/href="(https:\/\/ak\.sv\/(series|show)\/.*?)"/);
        if (parentMatch) {
          const seriesUrl = parentMatch[1];
          data.parent_url = cleanUrl(seriesUrl);
          const seriesHtml = await akFetch(seriesUrl);
          if (seriesHtml) mainPageHtml = seriesHtml;
        }
      }

      // Story extraction
      const metaDesc = mainPageHtml.match(/<meta name="description" content="(.*?)"/s);
      if (metaDesc) data.story = cleanText(metaDesc[1]);

      if (data.story === 'غير متوفر' || data.story.length < 10) {
        const storyDiv = mainPageHtml.match(/<div class="story"[^>]*>(.*?)<\/div>/s);
        if (storyDiv) {
          data.story = cleanText(storyDiv[1]);
        } else {
          const pWhite = mainPageHtml.match(/<p class="text-white[^>]*>(.*?)<\/p>/s);
          if (pWhite) data.story = cleanText(pWhite[1]);
        }
      }

      // Metadata extraction
      const metadata = {};
      const metadataArr = [];
      const metaBlocks = html.match(/<div class="font-size-16 text-white[^>]*>(.*?)<\/div>/gs) || [];
      for (const block of metaBlocks) {
        const cleanItem = cleanText(block);
        if (cleanItem.includes(':')) {
          const parts = cleanItem.split(':');
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          if (key && val) metadata[key] = val;
        } else {
          const ratingMatch = cleanItem.match(/(\d+\s*\/\s*\d+)/);
          if (ratingMatch) {
            metadata['التقييم'] = ratingMatch[1];
          } else if (cleanItem) {
            metadataArr.push(cleanItem);
          }
        }
      }
      data.metadata = metadata;
      if (metadataArr.length > 0) data.metadata_items = metadataArr;

      if (url.includes('/series/') || url.includes('/show/') || isEpisode) {
        data.type = url.includes('/series/') || (data.parent_url && data.parent_url.includes('/series/')) ? 'series' : 'show';
        const episodes = [];
        const epRegex = /<a[^>]*href="(https:\/\/ak\.sv\/episode\/[^"]+)"[^>]*>(.*?)<\/a>/gs;
        let epMatch;
        const seenUrls = new Set();
        while ((epMatch = epRegex.exec(mainPageHtml)) !== null) {
          const epUrl = cleanUrl(epMatch[1]);
          const epTitle = cleanText(epMatch[2]);
          if (epTitle && !epMatch[0].includes('<img') && !seenUrls.has(epUrl)) {
            seenUrls.add(epUrl);
            episodes.push({ episode_title: epTitle, url: epUrl });
          }
        }
        data.episodes = episodes.sort((a, b) => {
          const nA = parseInt(a.episode_title.match(/\d+/)?.[0] || 0);
          const nB = parseInt(b.episode_title.match(/\d+/)?.[0] || 0);
          return nA - nB;
        });
        data.episode_count = data.episodes.length;

        if (isEpisode) {
          const links = [];
          const goRegex = /href="(http:\/\/go\.ak\.sv\/link\/\d+)"/g;
          let goMatch;
          const goUrls = new Set();
          while ((goMatch = goRegex.exec(html)) !== null) goUrls.add(goMatch[1]);
          for (const goUrl of goUrls) {
            const goHtml = await akFetch(goUrl);
            const dlPageMatch = goHtml.match(/href="(https:\/\/ak\.sv\/download\/.*?)"/);
            if (dlPageMatch) {
              const dlHtml = await akFetch(dlPageMatch[1]);
              const directMatch = dlHtml.match(/href="(https:\/\/[^"]+\.(mp4|mkv|avi|mov|flv|webm)[^"]*)"/i);
              if (directMatch) {
                const dUrl = cleanUrl(directMatch[1]);
                const quality = dUrl.match(/(1080p|720p|480p|360p|240p|4k|hd|sd)/i)?.[0]?.toUpperCase() || 'Unknown';
                links.push({ direct_url: dUrl, quality });
              }
            }
          }
          data.download_links = links;
        }
      } else {
        data.type = 'movie';
        const links = [];
        const goRegex = /href="(http:\/\/go\.ak\.sv\/link\/\d+)"/g;
        let goMatch;
        const goUrls = new Set();
        while ((goMatch = goRegex.exec(html)) !== null) {
          goUrls.add(goMatch[1]);
        }

        for (const goUrl of goUrls) {
          const goHtml = await akFetch(goUrl);
          const dlPageMatch = goHtml.match(/href="(https:\/\/ak\.sv\/download\/.*?)"/);
          if (dlPageMatch) {
            const dlHtml = await akFetch(dlPageMatch[1]);
            const directMatch = dlHtml.match(/href="(https:\/\/[^"]+\.(mp4|mkv|avi|mov|flv|webm)[^"]*)"/i);
            if (directMatch) {
              const dUrl = cleanUrl(directMatch[1]);
              const quality = dUrl.match(/(1080p|720p|480p|360p|240p|4k|hd|sd)/i)?.[0]?.toUpperCase() || 'Unknown';
              links.push({ direct_url: dUrl, quality });
            }
          }
        }
        data.download_links = links;
      }
      return NextResponse.json(data);
    }

    // Default proxy behavior for images/videos
    const targetUrl = searchParams.get('url');
    if (!targetUrl) return NextResponse.json({ error: 'Missing parameter' }, { status: 400 });

    const headers = new Headers();
    // Add specific User-Agent and Referer headers to bypass CDN blocking
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    headers.set('Referer', 'https://ak.sv/');

    // Pass range header for videos to support seeking and fast loading!
    const range = request.headers.get('range');
    if (range) {
      headers.set('range', range);
    }

    const response = await fetch(targetUrl, {
      headers,
      redirect: 'manual'
    });

    // If the origin redirects to a CDN, follow the redirect server-side (don't expose CDN URL to browser)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const resolvedLocation = new URL(location, targetUrl).toString();
        // Follow the redirect server-side to hide real CDN URL
        const cdnHeaders = new Headers();
        cdnHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        cdnHeaders.set('Referer', 'https://ak.sv/');
        if (range) cdnHeaders.set('Range', range);

        const cdnResponse = await fetch(resolvedLocation, { headers: cdnHeaders });
        const cdnHeaders2 = new Headers(cdnResponse.headers);
        cdnHeaders2.set('Access-Control-Allow-Origin', '*');
        // Remove content-disposition to allow browser inline playback
        cdnHeaders2.delete('content-disposition');

        return new Response(cdnResponse.body, {
          status: cdnResponse.status,
          statusText: cdnResponse.statusText,
          headers: cdnHeaders2,
        });
      }
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.delete('content-disposition');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
