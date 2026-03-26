'use client';
import { useState, useEffect } from 'react';
import { Play, Info } from 'lucide-react';
import Link from 'next/link';

export default function HeroSlider({ movies }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!movies || movies.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % movies.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [movies]);

    if (!movies || movies.length === 0) return null;

    const currentMovie = movies[currentIndex];

    return (
        <section
            className="hero-container"
            style={{ 
                backgroundImage: `url(${currentMovie.heroImage})`,
                transition: 'background-image 0.8s ease-in-out'
            }}
        >
            <div className="hero-overlay" />
            <div className="container-px hero-content">
                <div key={currentMovie.watchUrl} className="animate-fade">
                    <span style={{
                        color: '#e50914', fontSize: '0.75rem', letterSpacing: '3px',
                        fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '10px'
                    }}>
                        ✦ KIRA ORIGINAL
                    </span>
                    <h1 className="hero-title">{currentMovie.title || 'Kira Movie'}</h1>
                    <p className="hero-desc">
                        {currentMovie.story || 'شاهد أحدث الأفلام والمسلسلات بجودة عالية وبدون إعلانات.'}
                    </p>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <Link href={currentMovie.watchUrl} className="btn btn-play">
                            <Play fill="black" size={20} /> تشغيل
                        </Link>
                        <button className="btn btn-info" onClick={() => window.location.href = currentMovie.watchUrl}>
                            <Info size={20} /> مزيد من التفاصيل
                        </button>
                    </div>
                </div>

                {/* Dots indicator */}
                {movies.length > 1 && (
                    <div style={{
                        position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: '8px', zIndex: 10
                    }}>
                        {movies.map((m, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                style={{
                                    width: currentIndex === idx ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: currentIndex === idx ? '#e50914' : 'rgba(255,255,255,0.4)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    padding: 0
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
