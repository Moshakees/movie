'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import MovieCard from '@/components/MovieCard';
import { getMovieDetails, getEpisodeLink, fetchByGenre, fetchTrending, fetchTopRated } from '@/lib/api';
import { ChevronLeft, Play, Info, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Suspense } from 'react';

function WatchContent() {
    const searchParams = useSearchParams();
    const idParam = searchParams.get('id');
    const urlParam = searchParams.get('url');

    let initialUrl = '';
    if (idParam) {
        try { initialUrl = decodeURIComponent(atob(idParam)); } catch (e) { }
    } else if (urlParam) {
        initialUrl = urlParam;
    }
    const url = initialUrl;

    const [details, setDetails] = useState(null);
    const [videoSrc, setVideoSrc] = useState(null);
    const [currentEpTitle, setCurrentEpTitle] = useState('');
    const [currentEpPoster, setCurrentEpPoster] = useState('');
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestTitle, setSuggestTitle] = useState('');
    const [suggestSlug, setSuggestSlug] = useState('foreign-movies');

    useEffect(() => {
        if (url) loadDetails();
    }, [url]);

    // ─── Determine content type from URL ─────────────────────────────────────
    function detectType(u) {
        if (!u) return 'movies';
        if (u.includes('/series/')) return 'series';
        if (u.includes('/show/')) return 'shows';
        if (u.includes('/episode/')) return 'series';
        if (u.includes('/mix/')) return 'mix';
        return 'movies';
    }

    // ─── Map content type + metadata to best suggestion slug ─────────────────
    function getBestSlug(type, meta) {
        const metaStr = JSON.stringify(meta || '').toLowerCase();

        if (type === 'series') {
            if (metaStr.includes('تركي')) return { slug: 'turki', label: 'مسلسلات تركية' };
            if (metaStr.includes('كوري')) return { slug: 'korean-series', label: 'مسلسلات كورية' };
            if (metaStr.includes('عرب')) return { slug: 'arabic', label: 'مسلسلات عربية' };
            if (metaStr.includes('آسي') || metaStr.includes('اسي')) return { slug: 'asia-series', label: 'مسلسلات آسيوية' };
            return { slug: 'Foreign-series', label: 'مسلسلات أجنبية' };
        }
        if (type === 'shows') {
            if (metaStr.includes('مصارعة')) return { slug: 'wrestling', label: 'مصارعة حرة' };
            return { slug: 'tv-shows', label: 'برامج تلفزيونية' };
        }
        // movies
        if (metaStr.includes('أكشن') || metaStr.includes('action')) return { slug: 'action-movies', label: 'أفلام أكشن' };
        if (metaStr.includes('رعب') || metaStr.includes('horror')) return { slug: 'horror-movies', label: 'أفلام رعب' };
        if (metaStr.includes('هند')) return { slug: 'hindi-movies', label: 'أفلام هندية' };
        if (metaStr.includes('netflix')) return { slug: 'netflix-movies', label: 'أفلام NETFLIX' };
        if (metaStr.includes('أنيم') || metaStr.includes('كرتون')) return { slug: 'anmi', label: 'أنمي وكرتون' };
        if (metaStr.includes('كوري')) return { slug: 'korean-movies', label: 'أفلام كورية' };
        if (metaStr.includes('آسي') || metaStr.includes('اسي')) return { slug: 'asia-movies', label: 'أفلام آسيوية' };
        return { slug: 'foreign-movies', label: 'أفلام أجنبية' };
    }

    async function loadDetails() {
        setLoading(true);
        try {
            const data = await getMovieDetails(url);
            if (!data) return;
            setDetails(data);

            if (data.episodes && data.episodes.length > 0) {
                loadEpisode(data.episodes[0].link, data.episodes[0].title);
            } else if (data.info && data.info.length > 0) {
                loadEpisode(data.info[0].link, data.info[0].title || data.title);
            } else {
                loadEpisode(url, data.title);
            }

            // ── Load suggestions based on content type ─────────────────────
            loadSuggestions(data);

        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    async function loadSuggestions(data) {
        try {
            const type = detectType(url);
            const allMeta = { ...data.metadata, story: data.story, title: data.title };
            const { slug, label } = getBestSlug(type, allMeta);
            setSuggestTitle(label);
            setSuggestSlug(slug);
            const results = await fetchByGenre(slug, 1);
            // Filter out the current item
            const filtered = results.filter(m => {
                const mUrl = m.url || m.link || '';
                return !mUrl.includes(url) && !url.includes(mUrl.split('/').slice(-1)[0]);
            });
            setSuggestions(filtered.slice(0, 18));
        } catch (e) {
            console.error('Suggestions error:', e);
        }
    }

    async function loadEpisode(epUrl, title) {
        setCurrentEpTitle(title);
        try {
            const res = await getEpisodeLink(epUrl);
            let rawVideo = null;
            if (res && res.videos && res.videos.length > 0) {
                const preferred = res.videos.find(v => typeof v === 'string' && v.match(/\.(mp4|webm)/i));
                rawVideo = preferred || res.videos[0];
                setCurrentEpPoster(res.poster || details?.poster || details?.image);
            } else if (res && res.link) {
                rawVideo = res.link;
            }
            if (rawVideo) setVideoSrc(`/api/proxy?url=${encodeURIComponent(rawVideo)}`);
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', flexDirection: 'column', gap: '20px' }}>
            <div className="netflix-title" style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>KIRA</div>
            <div className="loader"></div>
            <style jsx>{`
                @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
                .loader{width:40px;height:40px;border:4px solid #333;border-top-color:#e50914;border-radius:50%;animation:spin 1s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
            `}</style>
        </div>
    );

    const episodesList = details?.episodes || details?.info || [];

    return (
        <>
            <Navbar />

            <div className="container-px" style={{ paddingBottom: '60px' }}>
                <div className="watch-layout">

                    {/* ── Main player area ─────────────────────────────────── */}
                    <div className="animate-fade">
                        <VideoPlayer
                            src={videoSrc}
                            title={currentEpTitle}
                            poster={currentEpPoster}
                            qualities={details?.download_links || []}
                            onQualityChange={(newUrl) =>
                                setVideoSrc(`/api/proxy?url=${encodeURIComponent(newUrl)}`)
                            }
                        />

                        {/* Title & Meta */}
                        <div style={{ marginTop: '32px' }}>
                            <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.6rem)', fontWeight: '800', marginBottom: '16px' }}>
                                {details?.title}
                            </h1>

                            {/* Metadata badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                                {details?.metadata && Object.entries(details.metadata).map(([k, v]) => (
                                    <span key={k} style={{
                                        background: '#111', border: '1px solid #2a2a2a',
                                        padding: '6px 14px', borderRadius: '20px',
                                        fontSize: '0.85rem', color: '#ccc'
                                    }}>
                                        <span style={{ color: '#777' }}>{k}: </span>
                                        <span style={{ color: 'white', fontWeight: '600' }}>{v}</span>
                                    </span>
                                ))}
                                {details?.metadata_items?.map((item, i) => (
                                    <span key={i} style={{
                                        background: '#111', border: '1px solid #2a2a2a',
                                        padding: '6px 14px', borderRadius: '20px',
                                        fontSize: '0.85rem', color: 'white'
                                    }}>{item}</span>
                                ))}
                            </div>

                            {/* Story */}
                            <div style={{ background: '#0c0c0c', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e1e1e' }}>
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#e50914' }}>
                                    <Info size={18} /> قصة العمل
                                </h3>
                                <p style={{ color: '#bbb', lineHeight: '1.9', fontSize: '0.95rem' }}>
                                    {details?.story && details.story !== 'غير متوفر'
                                        ? details.story
                                        : 'استمتع بمشاهدة أحدث حلقات هذا العمل الحصري بجودة عالية وتجربة خالية من الإعلانات.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Sidebar: Episodes list ────────────────────────────── */}
                    {episodesList.length > 0 && (
                        <div className="sidebar animate-fade">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>قائمة الحلقات</h3>
                                <span style={{ fontSize: '0.78rem', color: '#555', background: '#111', padding: '3px 10px', borderRadius: '20px' }}>
                                    {episodesList.length} حلقة
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '65vh', overflowY: 'auto', paddingLeft: '4px' }}>
                                {episodesList.map((ep, i) => (
                                    <div
                                        key={i}
                                        onClick={() => loadEpisode(ep.link, ep.title)}
                                        className={`ep-item ${currentEpTitle === ep.title ? 'ep-active' : ''}`}
                                    >
                                        <div className={`ep-num ${currentEpTitle === ep.title ? 'ep-num-active' : ''}`}>
                                            {currentEpTitle === ep.title ? <Play size={12} fill="white" /> : i + 1}
                                        </div>
                                        <div className="ep-title">{ep.title}</div>
                                        {currentEpTitle === ep.title && <div className="pulse-dot" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Suggestions Section ──────────────────────────────────── */}
                {suggestions.length > 0 && (
                    <section style={{ marginTop: '60px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <Sparkles size={20} style={{ color: '#e50914' }} />
                                قد يعجبك أيضاً
                                <span style={{
                                    background: 'rgba(229,9,20,0.12)',
                                    color: '#e50914',
                                    border: '1px solid rgba(229,9,20,0.25)',
                                    fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px',
                                    fontWeight: '700', letterSpacing: '0.5px'
                                }}>
                                    {suggestTitle}
                                </span>
                            </h2>
                            <Link
                                href={`/genre/${suggestSlug}`}
                                style={{
                                    color: '#e50914', fontSize: '0.82rem', fontWeight: '700',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    border: '1px solid rgba(229,9,20,0.3)', padding: '4px 14px', borderRadius: '20px'
                                }}
                            >
                                عرض الكل <ChevronLeft size={14} />
                            </Link>
                        </div>

                        <div className="movie-slider">
                            {suggestions.map((movie, i) => (
                                <div key={i} className="slider-item">
                                    <MovieCard movie={movie} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <style jsx>{`
                /* Episodes */
                .ep-item {
                    display: flex; align-items: center; gap: 12px;
                    padding: 12px 14px;
                    cursor: pointer; border-radius: 10px;
                    background: #0f0f0f;
                    border: 1px solid transparent;
                    transition: all 0.22s ease;
                    font-size: 0.88rem; color: #ccc;
                }
                .ep-item:hover { background: #1a1a1a; border-color: #333; transform: translateX(-4px); }
                .ep-active { background: rgba(229,9,20,0.1) !important; border-color: rgba(229,9,20,0.4) !important; color: white !important; }
                .ep-num {
                    width: 28px; height: 28px; min-width: 28px;
                    background: #222; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem; font-weight: 700; color: #888;
                }
                .ep-num-active { background: #e50914; color: white; }
                .ep-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .pulse-dot {
                    width: 7px; height: 7px; min-width: 7px;
                    background: #e50914; border-radius: 50%;
                    box-shadow: 0 0 8px #e50914;
                    animation: pulse-ring 1.4s ease infinite;
                }
                @keyframes pulse-ring {
                    0%   { transform: scale(0.85); opacity: 1; }
                    50%  { transform: scale(1); opacity: .8; }
                    100% { transform: scale(0.85); opacity: 1; }
                }

                /* scrollbar */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #e50914; }
            `}</style>
        </>
    );
}

export default function WatchPage() {
    return (
        <main style={{ minHeight: '100vh', background: '#000' }}>
            <Suspense fallback={
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', flexDirection: 'column', gap: '20px' }}>
                    <div className="netflix-title" style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>KIRA</div>
                    <div className="loader"></div>
                    <style jsx>{`
                        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
                        .loader{width:40px;height:40px;border:4px solid #333;border-top-color:#e50914;border-radius:50%;animation:spin 1s linear infinite}
                        @keyframes spin{to{transform:rotate(360deg)}}
                    `}</style>
                </div>
            }>
                <WatchContent />
            </Suspense>
        </main>
    );
}
