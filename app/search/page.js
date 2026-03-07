'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { searchMovies } from '@/lib/api';
import { Search } from 'lucide-react';

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query) {
            handleSearch();
        }
    }, [query]);

    async function handleSearch() {
        setLoading(true);
        try {
            const data = await searchMovies(query);
            setResults(data || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    return (
        <div className="container-px" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '1.2rem', color: '#999', fontWeight: '400' }}>
                    نتائج البحث عن: <span style={{ color: 'white', fontWeight: '600' }}>"{query}"</span>
                </h1>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <div className="loader"></div>
                </div>
            ) : results.length > 0 ? (
                <div className="movie-grid">
                    {results.map((movie, i) => (
                        <MovieCard key={i} movie={movie} />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '100px', color: '#666' }}>
                    <Search size={60} style={{ marginBottom: '20px', opacity: 0.5 }} />
                    <h2 style={{ fontSize: '1.5rem' }}>عذراً، لم نجد أي نتائج تطابق بحثك.</h2>
                    <p style={{ marginTop: '10px' }}>جرب البحث بكلمات مختلفة أو تحقق من الكتابة.</p>
                </div>
            )}

            <style jsx>{`
        .loader { width: 40px; height: 40px; border: 4px solid #333; border-top-color: #e50914; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

export default function SearchPage() {
    return (
        <main style={{ minHeight: '100vh', background: '#000' }}>
            <Navbar />
            <Suspense fallback={<div>تحميل...</div>}>
                <SearchResults />
            </Suspense>
        </main>
    );
}
