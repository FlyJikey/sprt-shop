import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Магазин СПАРТАК — Спортивные товары, Электроника и Бытовая техника",
  description: "Огромный ассортимент товаров: электроника, бытовая техника, спортинвентарь, одежда и многое другое по честным ценам в наличии.",
  keywords: ["Магазин Спартак", "спорттовары", "электроника РФ", "бытовая техника в наличии", "купить онлайн с самовывозом"],
  openGraph: {
    title: "Магазин СПАРТАК",
    description: "SPRT-SHOP. Более 20 000 товаров в постоянном наличии.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://sprt-shop.vercel.app",
    siteName: "Магазин СПАРТАК",
    locale: "ru_RU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
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