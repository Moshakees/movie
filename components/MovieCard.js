import Link from 'next/link';

export default function MovieCard({ movie }) {
    const movieUrl = movie.url || movie.link;
    // Encode URL securely to hide the original source
    const encodedId = typeof btoa !== 'undefined'
        ? btoa(encodeURIComponent(movieUrl))
        : Buffer.from(encodeURIComponent(movieUrl)).toString('base64');
    const watchUrl = `/watch?id=${encodedId}`;
    const displayImage = movie.image || movie.img || movie.poster;

    return (
        <Link href={watchUrl} className="movie-card animate-fade">
            <img src={displayImage} alt={movie.title} loading="lazy" />
            <div className="card-meta">
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>{movie.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '5px' }}>
                    {movie.year || movie.release || ''} {movie.quality ? `• ${movie.quality}` : ''}
                </div>
            </div>
        </Link>
    );
}
