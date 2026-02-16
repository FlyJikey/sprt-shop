import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Магазин СПАРТАК",
  description: "Premium E-Commerce Experience",
};

// --- МАГИЧЕСКАЯ СТРОКА ---
// Она отключает попытки статической генерации для ВСЕГО сайта.
// Это решает ошибки сборки с useSearchParams() раз и навсегда.
export const dynamic = "force-dynamic"; 

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}