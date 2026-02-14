import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- ВОТ ЭТА СТРОКА ОБЯЗАТЕЛЬНА! Без неё стили не загрузятся.

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Modern Luxury Store",
  description: "Premium E-Commerce Experience",
};

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