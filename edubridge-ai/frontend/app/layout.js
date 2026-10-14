import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/app/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'EduBridge AI — Learn in your language. Learn without limits.',
  description: 'AI-powered multilingual educational companion. Learn in Marathi, Hindi, and English with your personal AI tutor.',
  keywords: 'education, AI, multilingual, Marathi, Hindi, learning, EduBridge',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Devanagari:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
