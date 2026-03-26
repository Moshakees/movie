import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import HeroSlider from '@/components/HeroSlider';
import { fetchTrending, fetchTopRated, fetchFeatured, fetchByGenre } from '@/lib/api';
import { Play, Info, ChevronLeft, Star } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 3600; // Cache the homepage for 1 hour (ISR) - essential to prevent proxy bans!

// Helper: encode URL for obfuscation
function encodeMovieUrl(url) {
    if (!url) return '';
    return Buffer.from(encodeURIComponent(url)).toString('base64');
}

// Reusable row component (server-side)
async function MovieRow({ title, slug, movies }) {
    if (!movies || movies.length === 0) return null;
    return (
        <section style={{ marginBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {title}
                </h2>
                <Link href={`/genre/${slug}`} style={{
                    color: '#e50914', fontSize: '0.82rem', fontWeight: '700',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    border: '1px solid rgba(229,9,20,0.3)', padding: '4px 12px', borderRadius: '20px',
                    transition: 'all 0.2s'
                }}>
                    عرض الكل <ChevronLeft size={14} />
                </Link>
            </div>
            <div className="movie-slider">
                {movies.slice(0, 16).map((movie, i) => (
                    <div key={i} className="slider-item">
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>
        </section>
    );
}

// Delay helper to prevent hitting rate limits on the CORS proxy
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchInChunksWithDelay(tasks, chunkSize = 3, delayMs = 600) {
    const results = [];
    for (let i = 0; i < tasks.length; i += chunkSize) {
        const chunk = tasks.slice(i, i + chunkSize);
        const resolvedChunk = await Promise.allSettled(chunk.map(fn => fn()));
        results.push(...resolvedChunk);
        if (i + chunkSize < tasks.length) await delay(delayMs);
    }
    return results;
}

export default async function Home() {
    // 1. Fetch core sections sequentially to avoid triggering 429 Too Many Requests
    const [featured, trending, topRated] = await fetchInChunksWithDelay([
        () => fetchFeatured(),
        () => fetchTrending(),
        () => fetchTopRated()
    ], 3, 500);

    const featuredMovies = featured.status === 'fulfilled' ? featured.value || [] : [];
    const trendingMovies = trending.status === 'fulfilled' ? trending.value || [] : [];
    const topRatedSeries = topRated.status === 'fulfilled' ? topRated.value || [] : [];

    // 2. Fetch category rows sequentially in small batches
    const genreTasks = [
        () => fetchByGenre('netflix-movies'), () => fetchByGenre('foreign-movies'),
        () => fetchByGenre('action-movies'), () => fetchByGenre('horror-movies'),
        () => fetchByGenre('hindi-movies'), () => fetchByGenre('asia-movies'),
        () => fetchByGenre('turki'), () => fetchByGenre('arabic'),
        () => fetchByGenre('Foreign-series'), () => fetchByGenre('asia-series'),
        () => fetchByGenre('korean-series'), () => fetchByGenre('anmi')
    ];

    const categoryResults = await fetchInChunksWithDelay(genreTasks, 3, 800);
    const get = (index) => categoryResults[index]?.status === 'fulfilled' ? categoryResults[index].value || [] : [];

    const rows = [
        { title: '🔥 الأكثر مشاهدة', slug: 'movies', movies: trendingMovies },
        { title: '⭐ مسلسلات مميزة', slug: 'series', movies: topRatedSeries },
        { title: '🎬 أفلام NETFLIX', slug: 'netflix-movies', movies: get(0) },
        { title: '🌍 أفلام أجنبية', slug: 'foreign-movies', movies: get(1) },
        { title: '🎭 أفلام أكشن', slug: 'action-movies', movies: get(2) },
        { title: '👻 أفلام رعب', slug: 'horror-movies', movies: get(3) },
        { title: '🇮🇳 أفلام هندية', slug: 'hindi-movies', movies: get(4) },
        { title: '🌏 أفلام آسيوية', slug: 'asia-movies', movies: get(5) },
        { title: '🇹🇷 مسلسلات تركية', slug: 'turki', movies: get(6) },
        { title: '🇸🇦 مسلسلات عربية', slug: 'arabic', movies: get(7) },
        { title: '🌐 مسلسلات أجنبية', slug: 'Foreign-series', movies: get(8) },
        { title: '🌸 مسلسلات آسيوية', slug: 'asia-series', movies: get(9) },
        { title: '🇰🇷 مسلسلات كورية', slug: 'korean-series', movies: get(10) },
        { title: '🎌 أنمي وكرتون', slug: 'anmi', movies: get(11) },
    ];

    // Prepare Hero Movies
    const heroMoviesSource = featuredMovies.length > 0 ? featuredMovies : trendingMovies;
    const heroMovies = heroMoviesSource.slice(0, 7).map((movie) => {
        const urlToEncode = movie.url || movie.link || '';
        return {
            title: movie.title,
            story: movie.story,
            watchUrl: `/watch?id=${Buffer.from(encodeURIComponent(urlToEncode)).toString('base64')}`,
            heroImage: movie.image || movie.img || movie.poster || '',
        };
    });

    return (
        <main>
            <Navbar />

            {/* ─── Hero Section ───────────────────────────────────────────── */}
            {heroMovies.length > 0 && <HeroSlider movies={heroMovies} />}

            {/* ─── Main Content ────────────────────────────────────────────── */}
            <div className="container-px row-container">

                {/* ① قسم المميزة — أول قسم */}
                {featuredMovies.length > 0 && (
                    <section style={{ marginBottom: '50px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Star size={20} fill="#e50914" color="#e50914" />
                                المميزة
                                <span style={{ background: 'linear-gradient(135deg,#e50914,#ff6b35)', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px', fontWeight: '700' }}>
                                    FEATURED
                                </span>
                            </h2>
                            <Link href="/discover?type=series&category=87&section=&title=مسلسلات%20رمضان" style={{
                                color: '#e50914', fontSize: '0.82rem', fontWeight: '700',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                border: '1px solid rgba(229,9,20,0.3)', padding: '4px 12px', borderRadius: '20px',
                            }}>
                                عرض الكل <ChevronLeft size={14} />
                            </Link>
                        </div>
                        <div className="movie-slider">
                            {featuredMovies.slice(0, 16).map((movie, i) => (
                                <div key={i} className="slider-item">
                                    <MovieCard movie={movie} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ② بقية الأقسام */}
                {rows.map(row => (
                    <MovieRow key={row.slug} title={row.title} slug={row.slug} movies={row.movies} />
                ))}
            </div>

            {/* ─── Footer ─────────────────────────────────────────────────── */}
            <footer style={{ padding: '60px 4%', background: '#000', borderTop: '1px solid #111', textAlign: 'center', color: '#555' }}>
                <div className="netflix-title" style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#e50914' }}>
                    KIRA MOVIE
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <Link href="#" style={{ color: '#555', transition: 'color 0.2s' }}>عن الموقع</Link>
                    <Link href="#" style={{ color: '#555' }}>سياسة الخصوصية</Link>
                    <Link href="#" style={{ color: '#555' }}>اتصل بنا</Link>
                </div>
                <p style={{ fontSize: '0.8rem' }}>© 2026 Kira Movie. جميع الحقوق محفوظة.</p>
            </footer>
        </main>
    );
}
