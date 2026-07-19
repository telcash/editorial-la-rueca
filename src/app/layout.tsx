import type { Metadata } from 'next';
import { Geist_Mono, Poppins, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Editorial La Rueca',
  description:
    'Editorial independiente que acompaña a autores en la publicación de sus libros con cercanía, claridad y cuidado editorial.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
