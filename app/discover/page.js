import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { fetchByFilters } from '@/lib/api';
import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';

export default async function DiscoverPage(props) {
    const searchParams = await props.searchParams;
    const type = searchParams?.type || 'movies';
    const category = searchParams?.category || '';
    const section = searchParams?.section || '';
    const title = searchParams?.title || 'عرض الكل';
    const page = parseInt(searchParams?.page || '1', 10);

    const data = await fetchByFilters({ type, category, section, page });
    const movies = data.results || [];

    // Create pagination links
    const prevPageUrl = page > 1 ? `/discover?type=${type}&category=${category}&section=${section}&title=${encodeURIComponent(title)}&page=${page - 1}` : null;
    const nextPageUrl = movies.length >= 20 ? `/discover?type=${type}&category=${category}&section=${section}&title=${encodeURIComponent(title)}&page=${page + 1}` : null;

    return (
        <main style={{ minHeight: '100vh', background: '#000' }}>
            <Navbar />

            <div className="container-px" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
                <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <LayoutGrid size={28} color="#e50914" />
                    <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>{title}</h1>
                </div>

                {movies.length > 0 ? (
                    <>
                        <div className="movie-grid">
                            {movies.map((movie, i) => (
                                <MovieCard key={i} movie={movie} />
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '50px' }}>
                            {prevPageUrl && (
                                <Link href={prevPageUrl} className="btn-pagination">
                                    الصفحة السابقة
                                </Link>
                            )}
                            <span style={{ padding: '10px 20px', background: '#333', borderRadius: '5px', fontWeight: 'bold' }}>
                                صفحة {page}
                            </span>
                            {nextPageUrl && (
                                <Link href={nextPageUrl} className="btn-pagination">
                                    الصفحة التالية
                                </Link>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#666' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>لا توجد نتائج حالياً في هذه الصفحة.</h2>
                    </div>
                )}
            </div>



            <footer style={{ padding: '60px 4%', background: '#000', borderTop: '1px solid #1a1a1a', textAlign: 'center', color: '#666' }}>
                <div className="netflix-title" style={{ fontSize: '1.5rem', marginBottom: '20px' }}>KIRA MOVIE</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', fontSize: '0.9rem' }}>
                    <Link href="#">عن الموقع</Link>
                    <Link href="#">سياسة الخصوصية</Link>
                    <Link href="#">اتصل بنا</Link>
                </div>
                <p>© 2026 Kira Movie. جميع الحقوق محفوظة.</p>
            </footer>
        </main>
    );
}
