import './globals.css';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata = {
  title: 'Kira Movie - Kira Movie',
  description: 'شاهد أحدث الأفلام والمسلسلات بجودة عالية',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body className={outfit.className}>
        {children}
      </body>
    </html>
  );
}
