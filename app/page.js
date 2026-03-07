import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { fetchTrending, fetchTopRated, fetchFeatured, fetchByGenre } from '@/lib/api';
import { Play, Info, ChevronLeft, Star } from 'lucide-react';
import Link from 'next/link';

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

export default async function Home() {
    // Fetch all data in parallel
    const [featured, trending, topRated] = await Promise.allSettled([
        fetchFeatured(),
        fetchTrending(),
        fetchTopRated(),
    ]);

    const featuredMovies = featured.status === 'fulfilled' ? featured.value || [] : [];
    const trendingMovies = trending.status === 'fulfilled' ? trending.value || [] : [];
    const topRatedSeries = topRated.status === 'fulfilled' ? topRated.value || [] : [];

    // Fetch category rows in parallel (limit to avoid slow loads)
    const [
        netflixMovies, foreignMovies, actionMovies, horrorMovies,
        hindiMovies, asiaMovies, turkiSeries, arabicSeries,
        foreignSeries, asiaSeries, koreanSeries, anmi
    ] = await Promise.allSettled([
        fetchByGenre('netflix-movies'), fetchByGenre('foreign-movies'),
        fetchByGenre('action-movies'), fetchByGenre('horror-movies'),
        fetchByGenre('hindi-movies'), fetchByGenre('asia-movies'),
        fetchByGenre('turki'), fetchByGenre('arabic'),
        fetchByGenre('Foreign-series'), fetchByGenre('asia-series'),
        fetchByGenre('korean-series'), fetchByGenre('anmi'),
    ]);

    const get = (r) => r.status === 'fulfilled' ? r.value || [] : [];

    // Hero movie: prefer from featured, else trending
    const heroMovie = featuredMovies?.[0] || trendingMovies?.[0];
    const heroImage = heroMovie?.image || heroMovie?.img || heroMovie?.poster;
    let watchUrl = '#';
    if (heroMovie) {
        const urlToEncode = heroMovie.url || heroMovie.link || '';
        watchUrl = `/watch?id=${Buffer.from(encodeURIComponent(urlToEncode)).toString('base64')}`;
    }

    const rows = [
        { title: '🔥 الأكثر مشاهدة', slug: 'movies', movies: trendingMovies },
        { title: '⭐ مسلسلات مميزة', slug: 'series', movies: topRatedSeries },
        { title: '🎬 أفلام NETFLIX', slug: 'netflix-movies', movies: get(netflixMovies) },
        { title: '🌍 أفلام أجنبية', slug: 'foreign-movies', movies: get(foreignMovies) },
        { title: '🎭 أفلام أكشن', slug: 'action-movies', movies: get(actionMovies) },
        { title: '👻 أفلام رعب', slug: 'horror-movies', movies: get(horrorMovies) },
        { title: '🇮🇳 أفلام هندية', slug: 'hindi-movies', movies: get(hindiMovies) },
        { title: '🌏 أفلام آسيوية', slug: 'asia-movies', movies: get(asiaMovies) },
        { title: '🇹🇷 مسلسلات تركية', slug: 'turki', movies: get(turkiSeries) },
        { title: '🇸🇦 مسلسلات عربية', slug: 'arabic', movies: get(arabicSeries) },
        { title: '🌐 مسلسلات أجنبية', slug: 'Foreign-series', movies: get(foreignSeries) },
        { title: '🌸 مسلسلات آسيوية', slug: 'asia-series', movies: get(asiaSeries) },
        { title: '🇰🇷 مسلسلات كورية', slug: 'korean-series', movies: get(koreanSeries) },
        { title: '🎌 أنمي وكرتون', slug: 'anmi', movies: get(anmi) },
    ];

    return (
        <main>
            <Navbar />

            {/* ─── Hero Section ───────────────────────────────────────────── */}
            <section
                className="hero-container"
                style={{ backgroundImage: `url(${heroImage})` }}
            >
                <div className="hero-overlay" />
                <div className="container-px hero-content">
                    <div className="animate-fade">
                        <span style={{
                            color: '#e50914', fontSize: '0.75rem', letterSpacing: '3px',
                            fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '10px'
                        }}>
                            ✦ KIRA ORIGINAL
                        </span>
                        <h1 className="hero-title">{heroMovie?.title || 'Kira Movie'}</h1>
                        <p className="hero-desc">
                            {heroMovie?.story || 'شاهد أحدث الأفلام والمسلسلات بجودة عالية وبدون إعلانات.'}
                        </p>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <Link href={watchUrl} className="btn btn-play">
                                <Play fill="black" size={20} /> تشغيل
                            </Link>
                            <button className="btn btn-info">
                                <Info size={20} /> مزيد من التفاصيل
                            </button>
                        </div>
                    </div>
                </div>
            </section>

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
                            <Link href="/genre/movies" style={{
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
