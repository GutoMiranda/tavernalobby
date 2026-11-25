import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cinzel, Inter } from "next/font/google";

import { RegistrarServiceWorker } from "@/components/registrar-sw";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Taverna O Lobby",
    template: "%s · Taverna O Lobby",
  },
  description: "Onde a party organiza as aventuras: datas, estalagens, presença, custos e caixinha.",
  applicationName: "Taverna O Lobby",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icons/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Taverna",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#3B2A1E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-parchment focus:px-3 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" className="mx-auto w-full max-w-screen-2xl px-4 pt-5 pb-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-screen-2xl flex-wrap gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:px-6 lg:px-8">
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Privacidade
          </Link>
          <Link href="/termos" className="underline-offset-4 hover:underline">
            Termos de uso
          </Link>
        </footer>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
