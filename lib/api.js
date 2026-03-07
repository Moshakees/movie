const BASE_URL = '/api/proxy';


async function proxyFetch(params) {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000') : '';

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${baseUrl}/api/proxy?${query}`);
  return res.json();
}

function transformItem(item) {
  if (!item) return null;
  return {
    title: item.title,
    url: item.url,
    link: item.url,
    image: item.poster,
    img: item.poster,
    poster: item.poster,
    type: item.type,
    year: item.year || '',
    quality: item.quality || ''
  };
}

export async function fetchTrending() {
  try {
    const data = await proxyFetch({ action: 'category_content', type: 'movies' });
    return (data?.results || []).map(transformItem);
  } catch (e) { return []; }
}

export async function fetchTopRated() {
  try {
    const data = await proxyFetch({ action: 'category_content', type: 'series' });
    return (data?.results || []).map(transformItem);
  } catch (e) { return []; }
}

export async function fetchFeatured() {
  try {
    const data = await proxyFetch({ action: 'featured' });
    return (data?.results || []).map(transformItem);
  } catch (e) { return []; }
}

export async function fetchLatest() {
  try {
    const data = await proxyFetch({ action: 'latest' });
    return data?.sections || [];
  } catch (e) { return []; }
}

export async function searchMovies(query) {
  try {
    const data = await proxyFetch({ action: 'search', q: query });
    return (data?.results || []).map(transformItem);
  } catch (e) { return []; }
}

export async function getMovieDetails(url) {
  try {
    const data = await proxyFetch({ action: 'details', url: url });
    if (!data) return null;


    // Transform episodes for series
    const episodes = data.episodes?.map(ep => ({
      title: ep.episode_title,
      link: ep.url,
      url: ep.url
    })) || [];

    // Transform download links for movies/episodes
    const videos = data.download_links?.map(link => link.direct_url) || [];

    return {
      ...data,
      episodes: episodes,
      info: episodes, // Compatibility
      videos: videos,
      link: videos[0] || null, // Best link for quick watch
      image: data.poster,
      img: data.poster,
      poster: data.poster
    };
  } catch (e) { return null; }
}

export async function getEpisodeLink(epUrl) {
  return getMovieDetails(epUrl);
}

export async function fetchByGenre(slug, page = 1) {
  try {
    // Direct type mappings (no extra filters)
    if (slug === 'movies' || slug === 'trending') {
      const data = await proxyFetch({ action: 'category_content', type: 'movies', page });
      return (data?.results || []).map(transformItem);
    }
    if (slug === 'series') {
      const data = await proxyFetch({ action: 'category_content', type: 'series', page });
      return (data?.results || []).map(transformItem);
    }
    if (slug === 'shows') {
      const data = await proxyFetch({ action: 'category_content', type: 'shows', page });
      return (data?.results || []).map(transformItem);
    }

    // Slug → API params mapping
    const mapping = {
      'turki': { type: 'series', section: '32' },
      'arabic': { type: 'series', section: '29' },
      'arabic-series': { type: 'series', section: '29' },
      'kleeji': { type: 'series', section: '29' },
      'foreign-movies': { type: 'movies', section: '30' },
      'Foreign-series': { type: 'series', section: '30' },
      'anmi': { type: 'movies', category: '30' },
      'wrestling': { type: 'shows', section: '43' },
      'ramadan': { type: 'movies', category: '87' },
      'netflix-movies': { type: 'movies', category: '72' },
      'asia-series': { type: 'series', section: '33' },
      'korean-series': { type: 'series', section: '33' },
      'hindi-movies': { type: 'movies', section: '31' },
      'tv-shows': { type: 'shows', section: '42' },
      'action-movies': { type: 'movies', category: '18' },
      'horror-movies': { type: 'movies', category: '22' },
      'drama-movies': { type: 'movies', category: '16' },
      'comedy-movies': { type: 'movies', category: '35' },
      'romance-movies': { type: 'movies', category: '10749' },
      'sci-fi-movies': { type: 'movies', category: '878' },
      'adventure-movies': { type: 'movies', category: '12' },
      'animation-movies': { type: 'movies', category: '16' },
      'documentary-movies': { type: 'movies', category: '99' },
      'family-movies': { type: 'movies', category: '10751' },
      'thriller-movies': { type: 'movies', category: '53' },
      'crime-movies': { type: 'movies', category: '80' },
      'asia-movies': { type: 'movies', section: '33' },
      'korean-movies': { type: 'movies', section: '33' },
    };

    const cfg = mapping[slug] || { type: 'movies' };
    const params = { action: 'category_content', type: cfg.type, page };
    if (cfg.category) params.category = cfg.category;
    if (cfg.section) params.section = cfg.section;

    const data = await proxyFetch(params);
    return (data?.results || []).map(transformItem);

  } catch (e) {
    console.error('Fetch error:', e);
    return [];
  }
}

export async function fetchCategories() {
  try {
    const data = await proxyFetch({ action: 'categories' });
    return data?.data || null;
  } catch (e) {
    console.error('Fetch categories error:', e);
    return null;
  }
}

export async function fetchByFilters({ type, category, section, page = 1 }) {
  try {
    const params = { action: 'category_content', type, page };
    if (category) params.category = category;
    if (section) params.section = section;

    const data = await proxyFetch(params);
    return {
      results: (data?.results || []).map(transformItem),
      count: data?.count || 0,
      totalPages: data?.total_pages_fetched || 1
    };
  } catch (e) {
    console.error('Fetch by filters error:', e);
    return { results: [], count: 0, totalPages: 1 };
  }
}

