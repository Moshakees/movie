'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { fetchByGenre } from '@/lib/api';
import { LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

const titleMap = {
    'netflix-movies': 'أفلام NETFLIX',
    'turki': 'مسلسلات تركية',
    'arabic': 'مسلسلات عربية',
    'foreign-movies': 'أفلام أجنبية',
    'Foreign-series': 'مسلسلات أجنبية',
    'anmi': 'أنمي وكرتون',
    'asia-series': 'مسلسلات آسيوية',
    'hindi-movies': 'أفلام هندية',
    'wrestling': 'مصارعة حرة',
    'tv-shows': 'برامج تلفزيونية',
    'action-movies': 'أفلام أكشن',
    'horror-movies': 'أفلام رعب',
    'drama-movies': 'أفلام دراما',
    'comedy-movies': 'أفلام كوميدي',
    'romance-movies': 'أفلام رومانسية',
    'sci-fi-movies': 'أفلام خيال علمي',
    'adventure-movies': 'أفلام مغامرات',
    'animation-movies': 'أفلام أنيميشن',
    'documentary-movies': 'أفلام وثائقية',
    'family-movies': 'أفلام عائلية',
    'thriller-movies': 'أفلام إثارة وتشويق',
    'crime-movies': 'أفلام جريمة',
    'arabic-series': 'مسلسلات عربية',
    'kleeji': 'مسلسلات خليجية',
    'korean-series': 'مسلسلات كورية',
    'asia-movies': 'أفلام آسيوية',
    'shows': 'برامج ومنوعات',
    'trending': 'الرائج الآن',
    'movies': 'أفلام',
    'series': 'مسلسلات',
};

export default function GenrePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const slug = params.slug;
    const currentPage = parseInt(searchParams.get('page') || '1');

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasNextPage, setHasNextPage] = useState(true);

    useEffect(() => {
        if (slug) loadGenre(currentPage);
    }, [slug, currentPage]);

    async function loadGenre(page) {
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
            const data = await fetchByGenre(slug, page);
            setMovies(data || []);
            setHasNextPage(data && data.length >= 20);
        } catch (e) {
            console.error(e);
            setMovies([]);
        }
        setLoading(false);
    }

    function goToPage(page) {
        if (page < 1) return;
        router.push(`/genre/${slug}?page=${page}`);
    }

    const displayTitle = titleMap[slug] || decodeURIComponent(slug || 'عرض الكل');

    const pageNumbers = [];
    const start = Math.max(1, currentPage - 2);
    const end = currentPage + 2;
    for (let i = start; i <= end; i++) {
        if (i >= 1) pageNumbers.push(i);
    }

    return (
        <main style={{ minHeight: '100vh', background: '#000' }}>
            <Navbar />
            <div className="container-px" style={{ paddingTop: '100px', paddingBottom: '100px' }}>

                {/* Header */}
                <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <LayoutGrid size={28} color="#e50914" />
                        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>{displayTitle}</h1>
                    </div>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>الصفحة {currentPage}</span>
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '120px', flexDirection: 'column', gap: '20px' }}>
                        <div className="loader"></div>
                        <span style={{ color: '#666' }}>جاري تحميل المحتوى...</span>
                    </div>
                ) : movies.length > 0 ? (
                    <div className="movie-grid">
                        {movies.map((movie, i) => (
                            <MovieCard key={i} movie={movie} />
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#666' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>لا توجد نتائج في هذا القسم.</h2>
                    </div>
                )}

                {/* Pagination */}
                {!loading && (movies.length > 0 || currentPage > 1) && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        gap: '10px', marginTop: '60px', flexWrap: 'wrap'
                    }}>
                        {/* Previous */}
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="page-btn nav-btn"
                        >
                            <ChevronRight size={18} /> السابق
                        </button>

                        {/* First page */}
                        {start > 1 && (
                            <>
                                <button onClick={() => goToPage(1)} className="page-btn">1</button>
                                {start > 2 && <span style={{ color: '#555' }}>...</span>}
                            </>
                        )}

                        {/* Page numbers */}
                        {pageNumbers.map(n => (
                            <button
                                key={n}
                                onClick={() => goToPage(n)}
                                className={`page-btn ${n === currentPage ? 'active' : ''}`}
                            >
                                {n}
                            </button>
                        ))}

                        {/* Next */}
                        {hasNextPage && (
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                className="page-btn nav-btn"
                            >
                                التالي <ChevronLeft size={18} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .loader {
                    width: 50px; height: 50px;
                    border: 4px solid #222;
                    border-top-color: #e50914;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .movie-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 20px;
                }

                .page-btn {
                    min-width: 44px; height: 44px;
                    padding: 0 14px;
                    background: #111;
                    border: 1px solid #333;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    display: flex; align-items: center; gap: 6px;
                }
                .page-btn:hover:not(:disabled) {
                    background: #1a1a1a;
                    border-color: #e50914;
                    color: #e50914;
                    transform: translateY(-2px);
                }
                .page-btn.active {
                    background: #e50914;
                    border-color: #e50914;
                    font-weight: 700;
                }
                .page-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                .nav-btn {
                    padding: 0 18px;
                }
            `}</style>
        </main>
    );
}
