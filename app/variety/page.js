import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { fetchCategories, fetchByFilters } from '@/lib/api';
import Link from 'next/link';

async function MovieRow({ title, type, category, section }) {
    const data = await fetchByFilters({ type, category, section, page: 1 });
    const movies = data.results || [];

    if (movies.length === 0) return null;

    const href = `/discover?type=${type}&category=${category || ''}&section=${section || ''}&title=${encodeURIComponent(title)}`;

    return (
        <section style={{ marginBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h2 className="row-title" style={{ margin: 0 }}>{title}</h2>
                <Link href={href} style={{ color: '#e50914', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    عرض الكل
                </Link>
            </div>
            <div className="movie-slider">
                {movies.map((movie, i) => (
                    <div key={i} className="slider-item">
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default async function VarietyPage() {
    const categoriesData = await fetchCategories();

    // We will display Sections as rows, and Categories as rows.
    const sections = categoriesData?.mix?.filters?.section?.items || [];
    const categories = categoriesData?.mix?.filters?.category?.items || [];

    return (
        <main>
            <Navbar />

            <div className="container-px row-container" style={{ marginTop: '100px' }}>
                <h1 style={{ color: 'white', marginBottom: '40px', fontSize: '2rem' }}>منوعات</h1>

                {/* Horizontal list of tags / categories for quick access */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '20px', marginBottom: '30px', scrollbarWidth: 'none' }}>
                    {sections.map(sec => (
                        <Link key={`tag-sec-${sec.id}`} href={`/discover?type=mix&section=${sec.id}&title=${encodeURIComponent(sec.name)}`} style={{ background: '#222', padding: '8px 16px', borderRadius: '20px', color: 'white', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            {sec.name}
                        </Link>
                    ))}
                    {categories.map(cat => (
                        <Link key={`tag-cat-${cat.id}`} href={`/discover?type=mix&category=${cat.id}&title=${encodeURIComponent(cat.name)}`} style={{ background: '#222', padding: '8px 16px', borderRadius: '20px', color: 'white', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            {cat.name}
                        </Link>
                    ))}
                </div>

                {/* Render Rows for each section */}
                {sections.map((sec) => (
                    <MovieRow
                        key={`sec-${sec.id}`}
                        title={sec.name}
                        type="mix"
                        section={sec.id}
                    />
                ))}

                {/* Render Rows for each category (top 8) */}
                {categories.slice(0, 8).map((cat) => (
                    <MovieRow
                        key={`cat-${cat.id}`}
                        title={cat.name}
                        type="mix"
                        category={cat.id}
                    />
                ))}
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
