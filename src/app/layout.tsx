import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import PushNotifications from "@/components/PushNotifications";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://app.sociasdigitales.com",
  ),
  title: {
    default: "Socias Digitales",
    template: "%s | Socias Digitales",
  },
  description: "Tu espacio de aprendizaje, comunidad y negocio digital.",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Socias Digitales",
    description: "Tu espacio de aprendizaje, comunidad y negocio digital.",
    siteName: "Socias Digitales",
    url: "/",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F4CAD8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Socias Digitales" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PushNotifications />
      </body>
    </html>
  );
}
