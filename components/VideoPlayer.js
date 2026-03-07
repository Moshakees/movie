'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, RotateCcw, RotateCw,
    Volume2, VolumeX, Maximize, Minimize,
    Settings, MonitorPlay, ChevronRight,
    X, List, Gauge, Download, Loader2
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatTime(sec) {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VideoPlayer({ src, title, poster, qualities = [], onQualityChange }) {
    // Core state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [buffered, setBuffered] = useState(0);   // % buffered
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const [isFS, setIsFS] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [tapAnim, setTapAnim] = useState(null);
    const [hoverTime, setHoverTime] = useState(null); // { pct, time }
    const [isDragging, setIsDragging] = useState(false);

    const videoRef = useRef(null);
    const wrapRef = useRef(null);
    const progressBarRef = useRef(null);
    const hideTimer = useRef(null);
    const lastTap = useRef(0);
    const draggingRef = useRef(false);  // non-state flag for mouse events

    // ── Re-load video when src changes ──────────────────────────────────────
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        setHasError(false);
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
        if (src) {
            v.load();
        }
    }, [src]);

    // ── Fullscreen events ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = () => setIsFS(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        document.addEventListener('webkitfullscreenchange', handler);
        return () => {
            document.removeEventListener('fullscreenchange', handler);
            document.removeEventListener('webkitfullscreenchange', handler);
        };
    }, []);

    // ── Volume sync ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    // ── UI hide timer ────────────────────────────────────────────────────────
    const resetHideTimer = useCallback(() => {
        setShowUI(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused && !showSettings) {
                setShowUI(false);
            }
        }, 3500);
    }, [showSettings]);

    useEffect(() => {
        window.addEventListener('mousemove', resetHideTimer);
        return () => {
            window.removeEventListener('mousemove', resetHideTimer);
            clearTimeout(hideTimer.current);
        };
    }, [resetHideTimer]);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (!videoRef.current) return;
            switch (e.code) {
                case 'Space': e.preventDefault(); handlePlayPause(); break;
                case 'ArrowRight': seek(10); break;
                case 'ArrowLeft': seek(-10); break;
                case 'ArrowUp': setVolume(v => Math.min(1, v + 0.1)); break;
                case 'ArrowDown': setVolume(v => Math.max(0, v - 0.1)); break;
                case 'KeyF': toggleFS(); break;
                case 'KeyM': setIsMuted(m => !m); break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // ── Core actions ─────────────────────────────────────────────────────────
    function handlePlayPause() {
        const v = videoRef.current;
        if (!v || !src) return;
        if (v.paused) {
            v.play().catch(console.error);
        } else {
            v.pause();
        }
    }

    function seek(delta) {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    }

    // ── Progress bar: get pct from mouse/touch event ─────────────────────────
    function getPctFromEvent(e) {
        const bar = progressBarRef.current;
        if (!bar) return 0;
        const rect = bar.getBoundingClientRect();
        // Physical left edge, regardless of RTL
        const x = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left) - rect.left;
        return Math.min(1, Math.max(0, x / rect.width));
    }

    function seekToPct(pct) {
        const v = videoRef.current;
        if (!v || !src || !v.duration) return;
        const t = pct * v.duration;
        v.currentTime = t;
        setProgress(pct * 100);
        setCurrentTime(t);
    }

    // Progress bar mouse events
    function onProgressMouseDown(e) {
        e.preventDefault();
        draggingRef.current = true;
        setIsDragging(true);
        const pct = getPctFromEvent(e);
        seekToPct(pct);

        const onMove = (ev) => {
            if (!draggingRef.current) return;
            const p = getPctFromEvent(ev);
            // Optimistic UI update during drag
            if (videoRef.current && videoRef.current.duration) {
                const t = p * videoRef.current.duration;
                setProgress(p * 100);
                setCurrentTime(t);
            }
        };
        const onUp = (ev) => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            setIsDragging(false);
            seekToPct(getPctFromEvent(ev));
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    function onProgressMouseMove(e) {
        const bar = progressBarRef.current;
        if (!bar || !videoRef.current?.duration) return;
        const pct = getPctFromEvent(e);
        setHoverTime({ pct, time: pct * videoRef.current.duration });
    }

    function onProgressMouseLeave() {
        setHoverTime(null);
    }

    // Touch support for progress bar
    function onProgressTouchStart(e) {
        e.stopPropagation(); // Don't trigger player tap-gestures
        const pct = getPctFromEvent(e);
        seekToPct(pct);
    }

    async function toggleFS() {
        const el = wrapRef.current;
        if (!el) return;
        try {
            if (!document.fullscreenElement) {
                if (el.requestFullscreen) await el.requestFullscreen();
                else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) await document.exitFullscreen();
                else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
            }
        } catch (e) { console.error(e); }
    }

    async function togglePiP() {
        const v = videoRef.current;
        if (!v) return;
        try {
            if (v !== document.pictureInPictureElement) await v.requestPictureInPicture();
            else await document.exitPictureInPicture();
        } catch (e) { console.error(e); }
    }

    function changeRate(rate) {
        if (videoRef.current) videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSettings(false);
    }

    // ── Touch: tap & double-tap ──────────────────────────────────────────────
    function handleTouchEnd(e) {
        const now = Date.now();
        const x = e.changedTouches[0].clientX;
        const mid = wrapRef.current?.offsetWidth / 2 || window.innerWidth / 2;
        const side = x < mid ? 'left' : 'right';

        if (now - lastTap.current < 280) {
            // Double-tap
            seek(side === 'right' ? 10 : -10);
            setTapAnim(side);
            setTimeout(() => setTapAnim(null), 700);
        } else {
            // Single-tap → toggle UI
            setShowUI(p => !p);
        }
        lastTap.current = now;
    }

    // ── Video event handlers ─────────────────────────────────────────────────
    function onTimeUpdate() {
        const v = videoRef.current;
        if (!v || isDragging) return;
        setCurrentTime(v.currentTime);
        if (v.duration) setProgress((v.currentTime / v.duration) * 100);
        // Update buffer
        if (v.buffered.length > 0) {
            const buf = (v.buffered.end(v.buffered.length - 1) / v.duration) * 100;
            setBuffered(buf);
        }
    }

    function onLoadedMetadata() {
        const v = videoRef.current;
        if (v) setDuration(v.duration);
    }

    function onError() {
        setHasError(true);
        setIsBuffering(false);
        setIsPlaying(false);
    }

    // ─────────────────────────────────────── RENDER ─────────────────────────
    return (
        <>
            <div
                ref={wrapRef}
                className={`kp-wrap ${isFS ? 'kp-fullscreen' : ''} ${!showUI ? 'kp-hide-cursor' : ''}`}
                onMouseMove={resetHideTimer}
                onMouseLeave={() => isPlaying && setShowUI(false)}
                onTouchEnd={handleTouchEnd}
            >
                {/* ── Video element ─────────────────────────────── */}
                {src ? (
                    <video
                        ref={videoRef}
                        className="kp-video"
                        poster={poster}
                        playsInline
                        preload="auto"
                        onTimeUpdate={onTimeUpdate}
                        onLoadedMetadata={onLoadedMetadata}
                        onPlay={() => { setIsPlaying(true); setIsBuffering(false); setHasError(false); }}
                        onPause={() => setIsPlaying(false)}
                        onWaiting={() => setIsBuffering(true)}
                        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                        onEnded={() => setIsPlaying(false)}
                        onError={onError}
                        onClick={handlePlayPause}
                    >
                        <source src={src} />
                        متصفحك لا يدعم تشغيل الفيديو.
                    </video>
                ) : (
                    /* ── No source yet: loading state ───────────── */
                    <div className="kp-placeholder">
                        {poster && <img src={poster} alt={title} className="kp-poster-bg" />}
                        <div className="kp-placeholder-inner">
                            <Loader2 size={48} className="kp-spinner-icon" />
                            <span>جاري تحضير الفيديو...</span>
                        </div>
                    </div>
                )}

                {/* ── Error state ───────────────────────────────── */}
                {hasError && (
                    <div className="kp-error">
                        <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                        <p>تعذّر تشغيل هذا الفيديو</p>
                        <button onClick={() => { setHasError(false); videoRef.current?.load(); }}>
                            إعادة المحاولة
                        </button>
                    </div>
                )}

                {/* ── Double-tap animation ──────────────────────── */}
                {tapAnim && (
                    <div className={`kp-tap-anim kp-tap-${tapAnim}`}>
                        {tapAnim === 'right' ? <RotateCw size={30} /> : <RotateCcw size={30} />}
                        <span>{tapAnim === 'right' ? '+10s' : '-10s'}</span>
                    </div>
                )}

                {/* ── Buffering spinner ─────────────────────────── */}
                {isBuffering && src && !hasError && (
                    <div className="kp-buffering">
                        <div className="kp-ring" />
                    </div>
                )}

                {/* ── Center play button ────────────────────────── */}
                {!isPlaying && !isBuffering && src && !hasError && (
                    <div className="kp-center-play" onClick={handlePlayPause}>
                        <Play size={54} fill="white" />
                    </div>
                )}

                {/* ── UI overlay (controls) ─────────────────────── */}
                <div className={`kp-ui ${showUI ? 'kp-ui-visible' : ''}`}>

                    {/* Top bar */}
                    <div className="kp-top">
                        <button className="kp-icon-btn" onClick={() => window.history.back()}>
                            <ChevronRight size={24} />
                        </button>
                        <div className="kp-title-block">
                            <span className="kp-title">{title}</span>
                            <span className="kp-status">
                                {isPlaying ? '● يُشاهد الآن' : isBuffering ? '⟳ جاري التحميل' : '⏸ متوقف'}
                            </span>
                        </div>
                    </div>

                    {/* ── Progress bar (fully custom, RTL-safe) ─── */}
                    <div className="kp-bottom">
                        <div
                            ref={progressBarRef}
                            className="kp-progress-wrap"
                            onMouseDown={onProgressMouseDown}
                            onMouseMove={onProgressMouseMove}
                            onMouseLeave={onProgressMouseLeave}
                            onTouchStart={onProgressTouchStart}
                        >
                            {/* Hover tooltip */}
                            {hoverTime !== null && (
                                <div
                                    className="kp-hover-tooltip"
                                    style={{ left: `${hoverTime.pct * 100}%` }}
                                >
                                    {formatTime(hoverTime.time)}
                                </div>
                            )}

                            {/* Track */}
                            <div className="kp-track">
                                {/* Buffered bar */}
                                <div
                                    className="kp-buffered"
                                    style={{ transform: `scaleX(${buffered / 100})` }}
                                />
                                {/* Filled / played bar */}
                                <div
                                    className="kp-filled"
                                    style={{ transform: `scaleX(${progress / 100})` }}
                                />
                                {/* Dot: always at exact progress position */}
                                <div
                                    className={`kp-dot ${isDragging ? 'kp-dot-dragging' : ''}`}
                                    style={{ left: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="kp-controls">
                            {/* Left */}
                            <div className="kp-ctrl-group">
                                <button className="kp-icon-btn kp-play-btn" onClick={handlePlayPause}>
                                    {isPlaying
                                        ? <Pause size={26} fill="white" />
                                        : <Play size={26} fill="white" />}
                                </button>
                                <button className="kp-icon-btn kp-skip" onClick={() => seek(-10)} title="تأخير 10ث">
                                    <RotateCcw size={20} /><span>10</span>
                                </button>
                                <button className="kp-icon-btn kp-skip" onClick={() => seek(10)} title="تقديم 10ث">
                                    <RotateCw size={20} /><span>10</span>
                                </button>
                                {/* Volume */}
                                <div className="kp-vol-group">
                                    <button className="kp-icon-btn" onClick={() => setIsMuted(m => !m)}>
                                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                    </button>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
                                        className="kp-vol-range"
                                    />
                                </div>
                                <div className="kp-time">
                                    <span>{formatTime(currentTime)}</span>
                                    <span className="kp-sep">/</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Right */}
                            <div className="kp-ctrl-group">
                                {src && (
                                    <a href={src} download target="_blank" rel="noreferrer" className="kp-icon-btn" title="تحميل">
                                        <Download size={18} />
                                    </a>
                                )}
                                <button className="kp-icon-btn" onClick={togglePiP} title="صورة في صورة">
                                    <MonitorPlay size={18} />
                                </button>

                                {/* Settings */}
                                <div className="kp-settings-wrap">
                                    <button
                                        className={`kp-icon-btn ${showSettings ? 'kp-active' : ''}`}
                                        onClick={() => setShowSettings(p => !p)}
                                    >
                                        <Settings size={20} />
                                    </button>
                                    {showSettings && (
                                        <div className="kp-menu">
                                            <div className="kp-menu-head">
                                                إعدادات التشغيل
                                                <X size={15} onClick={() => setShowSettings(false)} style={{ cursor: 'pointer' }} />
                                            </div>
                                            <div className="kp-menu-section">
                                                <div className="kp-menu-label"><Gauge size={12} /> السرعة</div>
                                                <div className="kp-menu-grid">
                                                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(r => (
                                                        <button
                                                            key={r}
                                                            className={playbackRate === r ? 'kp-sel' : ''}
                                                            onClick={() => changeRate(r)}
                                                        >{r === 1 ? 'عادي' : `${r}x`}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            {qualities.length > 0 && (
                                                <div className="kp-menu-section">
                                                    <div className="kp-menu-label"><List size={12} /> الجودة</div>
                                                    <div className="kp-menu-grid">
                                                        {qualities.map((q, i) => (
                                                            <button
                                                                key={i}
                                                                className={src?.includes(encodeURIComponent(q.direct_url)) ? 'kp-sel' : ''}
                                                                onClick={() => { onQualityChange?.(q.direct_url); setShowSettings(false); }}
                                                            >{q.quality}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Fullscreen */}
                                <button className="kp-icon-btn" onClick={toggleFS} title="تكبير الشاشة">
                                    {isFS ? <Minimize size={20} /> : <Maximize size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                /* ────────────────── WRAPPER ────────────────── */
                .kp-wrap {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #000;
                    border-radius: 10px;
                    overflow: hidden;
                    user-select: none;
                    touch-action: manipulation;
                    box-shadow: 0 24px 64px rgba(0,0,0,0.7);
                    -webkit-tap-highlight-color: transparent;
                }

                /* True fullscreen: fill entire viewport */
                .kp-wrap.kp-fullscreen,
                :fullscreen .kp-wrap,
                :-webkit-full-screen .kp-wrap {
                    border-radius: 0 !important;
                    aspect-ratio: unset !important;
                    width: 100vw !important;
                    height: 100vh !important;
                }

                .kp-hide-cursor { cursor: none; }

                /* ────────────────── VIDEO ──────────────────── */
                .kp-video {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                    background: #000;
                }

                /* ────────────────── PLACEHOLDER ────────────── */
                .kp-placeholder {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: #050505;
                }
                .kp-poster-bg {
                    position: absolute; inset: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    opacity: 0.25;
                    filter: blur(8px);
                }
                .kp-placeholder-inner {
                    position: relative;
                    display: flex; flex-direction: column; align-items: center; gap: 14px;
                    color: #aaa; font-size: 0.95rem;
                }
                .kp-spinner-icon {
                    color: #e50914;
                    animation: kp-spin 1s linear infinite;
                }
                @keyframes kp-spin { to { transform: rotate(360deg); } }

                /* ────────────────── ERROR ──────────────────── */
                .kp-error {
                    position: absolute; inset: 0;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 16px; background: rgba(0,0,0,0.85); color: white; text-align: center;
                    padding: 20px;
                }
                .kp-error p { font-size: 1.1rem; margin: 0; }
                .kp-error button {
                    background: #e50914; color: white; border: none;
                    padding: 10px 28px; border-radius: 8px;
                    font-size: 0.95rem; cursor: pointer; transition: 0.2s;
                }
                .kp-error button:hover { background: #c00; }

                /* ────────────────── BUFFERING ──────────────── */
                .kp-buffering {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    pointer-events: none;
                }
                .kp-ring {
                    width: 52px; height: 52px;
                    border: 4px solid rgba(255,255,255,0.15);
                    border-top-color: #e50914;
                    border-radius: 50%;
                    animation: kp-spin 0.85s linear infinite;
                }

                /* ────────────────── CENTER PLAY ────────────── */
                .kp-center-play {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }
                .kp-center-play > svg {
                    background: rgba(229,9,20,0.25);
                    border: 2px solid rgba(255,255,255,0.2);
                    border-radius: 50%;
                    padding: 22px;
                    backdrop-filter: blur(6px);
                    transition: 0.25s;
                    box-sizing: content-box;
                }
                .kp-center-play:hover > svg {
                    background: rgba(229,9,20,0.5);
                    transform: scale(1.08);
                }

                /* ────────────────── DOUBLE TAP ANIM ────────── */
                .kp-tap-anim {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    background: rgba(0,0,0,0.6);
                    color: white; padding: 14px 20px; border-radius: 50px;
                    font-size: 0.85rem; font-weight: 700;
                    animation: kp-tapfade 0.7s ease forwards;
                    pointer-events: none; z-index: 30;
                }
                .kp-tap-left  { left: 8%; }
                .kp-tap-right { right: 8%; }
                @keyframes kp-tapfade {
                    0%   { opacity: 0; transform: translateY(-50%) scale(0.8); }
                    25%  { opacity: 1; transform: translateY(-50%) scale(1); }
                    75%  { opacity: 1; }
                    100% { opacity: 0; }
                }

                /* ────────────────── UI OVERLAY ─────────────── */
                .kp-ui {
                    position: absolute; inset: 0;
                    display: flex; flex-direction: column; justify-content: space-between;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }
                .kp-ui.kp-ui-visible {
                    opacity: 1;
                    pointer-events: all;
                }

                /* ── Top bar ── */
                .kp-top {
                    display: flex; align-items: center; gap: 12px;
                    padding: 14px 16px;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent);
                }
                .kp-title-block { display: flex; flex-direction: column; }
                .kp-title { color: white; font-size: 1rem; font-weight: 700; line-height: 1.3; }
                .kp-status { color: #e50914; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }

                /* ── Bottom ── */
                .kp-bottom {
                    padding: 10px 14px 14px;
                    background: linear-gradient(to top, rgba(0,0,0,0.92), transparent);
                }

                /* ── Progress bar ── */
                .kp-progress-wrap {
                    position: relative;
                    height: 28px;           /* Large hit area */
                    display: flex;
                    align-items: center;
                    margin-bottom: 6px;
                    cursor: pointer;
                    user-select: none;
                    -webkit-user-select: none;
                }

                /* Hover tooltip */
                .kp-hover-tooltip {
                    position: absolute;
                    bottom: calc(100% + 6px);
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.9);
                    color: white;
                    padding: 3px 8px;
                    border-radius: 5px;
                    font-size: 0.72rem;
                    font-family: monospace;
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 10;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                /* Track: always LTR, scaleX grows from left */
                .kp-track {
                    position: relative;
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.18);
                    border-radius: 100px;
                    overflow: visible;
                    transition: height 0.18s ease;
                    direction: ltr;          /* critical: keep LTR for left% calc */
                }
                .kp-progress-wrap:hover .kp-track,
                .kp-track.dragging {
                    height: 6px;
                }

                /* Buffered bar */
                .kp-buffered {
                    position: absolute;
                    inset: 0;
                    background: rgba(255,255,255,0.25);
                    border-radius: 100px;
                    transform: scaleX(0);
                    transform-origin: left center;   /* ALWAYS from left physical edge */
                    transition: transform 0.4s ease;
                    will-change: transform;
                }

                /* Filled/played bar */
                .kp-filled {
                    position: absolute;
                    inset: 0;
                    background: #e50914;
                    border-radius: 100px;
                    transform: scaleX(0);
                    transform-origin: left center;   /* ALWAYS from left physical edge */
                    transition: transform 0.08s linear;
                    will-change: transform;
                }

                /* Dot — always visible, tracks progress */
                .kp-dot {
                    position: absolute;
                    top: 50%;
                    /* left set inline → always from physical left edge (LTR track) */
                    width: 14px;
                    height: 14px;
                    background: #fff;
                    border: 2.5px solid #e50914;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 0 3px rgba(229,9,20,0.25), 0 2px 6px rgba(0,0,0,0.5);
                    transition: left 0.08s linear, width 0.18s, height 0.18s, box-shadow 0.18s;
                    pointer-events: none;
                    z-index: 4;
                }
                .kp-progress-wrap:hover .kp-dot,
                .kp-dot.kp-dot-dragging {
                    width: 20px;
                    height: 20px;
                    box-shadow: 0 0 0 5px rgba(229,9,20,0.3), 0 3px 10px rgba(0,0,0,0.6);
                }

                /* ── Controls row ── */
                .kp-controls {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 6px; flex-wrap: nowrap;
                }
                .kp-ctrl-group {
                    display: flex; align-items: center; gap: 4px; flex-wrap: nowrap;
                }

                /* ── Icon buttons ── */
                .kp-icon-btn {
                    background: none; border: none;
                    color: rgba(255,255,255,0.88);
                    cursor: pointer; padding: 6px; border-radius: 6px;
                    display: flex; align-items: center; justify-content: center;
                    transition: color 0.18s, background 0.18s, transform 0.15s;
                    flex-shrink: 0; text-decoration: none;
                }
                .kp-icon-btn:hover { color: #e50914; background: rgba(255,255,255,0.08); transform: scale(1.12); }
                .kp-icon-btn.kp-active { color: #e50914; }
                .kp-play-btn:hover { transform: scale(1.2); }

                /* Skip */
                .kp-skip { position: relative; }
                .kp-skip span {
                    position: absolute; bottom: 2px;
                    font-size: 0.42rem; font-weight: 900; line-height: 1;
                    pointer-events: none;
                }

                /* Volume */
                .kp-vol-group { display: flex; align-items: center; gap: 4px; }
                .kp-vol-range {
                    width: 0; opacity: 0;
                    transition: width 0.28s, opacity 0.28s;
                    accent-color: #e50914; cursor: pointer;
                }
                .kp-vol-group:hover .kp-vol-range { width: 72px; opacity: 1; }

                /* Time */
                .kp-time { color: #bbb; font-size: 0.78rem; font-family: monospace; white-space: nowrap; }
                .kp-sep { margin: 0 4px; color: #555; }

                /* ── Settings menu ── */
                .kp-settings-wrap { position: relative; }
                .kp-menu {
                    position: absolute; bottom: calc(100% + 10px); left: 0;
                    width: 210px;
                    background: rgba(10,10,10,0.97);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 12px; padding: 14px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.8);
                    animation: kp-slideup 0.22s ease;
                    z-index: 50;
                }
                @keyframes kp-slideup {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .kp-menu-head {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 12px; padding-bottom: 10px;
                    border-bottom: 1px solid #1e1e1e;
                    font-size: 0.82rem; color: white; font-weight: 600;
                }
                .kp-menu-section { margin-bottom: 10px; }
                .kp-menu-label {
                    font-size: 0.72rem; color: #777; margin-bottom: 8px;
                    display: flex; align-items: center; gap: 5px;
                }
                .kp-menu-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; }
                .kp-menu-grid button {
                    background: #181818; border: 1px solid #252525;
                    color: white; padding: 5px 2px;
                    border-radius: 5px; font-size: 0.72rem;
                    cursor: pointer; transition: 0.18s;
                }
                .kp-menu-grid button:hover { background: #222; border-color: #e50914; }
                .kp-menu-grid button.kp-sel { background: #e50914; border-color: #e50914; font-weight: 700; }

                /* ────────────────── RESPONSIVE ─────────────── */
                @media (max-width: 480px) {
                    .kp-top { padding: 10px 10px; }
                    .kp-title { font-size: 0.82rem; }
                    .kp-bottom { padding: 6px 10px 10px; }
                    .kp-icon-btn { padding: 5px; }
                    .kp-time { display: none; }
                    .kp-vol-group .kp-vol-range { display: none; }
                    .kp-center-play > svg { padding: 16px; }
                    .kp-ring { width: 40px; height: 40px; }
                }

                @media (min-width: 481px) and (max-width: 768px) {
                    .kp-time { font-size: 0.7rem; }
                    .kp-vol-group .kp-vol-range { display: none; }
                }
            `}</style>
        </>
    );
}
