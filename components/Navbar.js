'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  const navLinks = [
    { name: 'الرئيسية', href: '/' },
    { name: 'أفلام', href: '/movies' },
    { name: 'مسلسلات', href: '/series' },
    { name: 'منوعات', href: '/variety' },
    { name: 'تليفزيون', href: '/tv' },
  ];

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''} container-px`}>
        <Link href="/" className="nav-logo netflix-title" style={{ fontSize: '1.8rem', margin: 0 }}>
          KIRA
        </Link>

        <div className="nav-links-container" style={{ marginRight: '40px' }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link" style={{ fontSize: '0.9rem', color: '#e5e5e5' }}>
              {link.name}
            </Link>
          ))}
        </div>

        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>

          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <form onSubmit={handleSearchSubmit} style={{
              display: 'flex',
              alignItems: 'center',
              background: searchOpen ? 'rgba(0,0,0,0.8)' : 'transparent',
              border: searchOpen ? '1px solid white' : 'none',
              padding: searchOpen ? '4px 10px' : '0',
              transition: 'all 0.3s',
              borderRadius: '2px'
            }}>
              <Search
                size={22}
                cursor="pointer"
                onClick={handleSearchToggle}
                style={{ flexShrink: 0 }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="أفلام، مسلسلات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: searchOpen ? '200px' : '0',
                  opacity: searchOpen ? 1 : 0,
                  transition: 'all 0.3s',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  outline: 'none',
                  marginRight: searchOpen ? '10px' : '0',
                  fontSize: '0.85rem'
                }}
              />
            </form>
          </div>

          <div className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} style={{ display: 'none', cursor: 'pointer' }}>
            <Menu size={24} />
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Menu */}
      <div className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px' }}>
          <X size={30} onClick={() => setMobileMenuOpen(false)} style={{ cursor: 'pointer', color: 'white' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 40px', gap: '25px', color: 'white' }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .nav-link:hover { color: #b3b3b3; }
        .mobile-sidebar {
          position: fixed;
          top: 0;
          right: -100%;
          width: 70%;
          height: 100%;
          background: rgba(0,0,0,0.95);
          backdrop-filter: blur(10px);
          z-index: 2000;
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-sidebar.open { right: 0; }
        
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
}
