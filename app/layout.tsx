import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Titulos em serifa (Direcao A "Pauta"); texto em Geist; numeros em Geist Mono.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestão Processual | Painel Jurídico",
  description: "Painel de gestão processual para escritórios de advocacia.",
  // Aplicativo instalavel no iPhone (Safari > Compartilhar > Adicionar a Tela de Inicio).
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Painel",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Ocupa a tela toda no iPhone (inclusive a area da ilha dinamica).
  viewportFit: "cover",
  themeColor: "#1e3a5f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} min-h-screen overflow-x-hidden bg-background font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
