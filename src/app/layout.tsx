import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Magic Frame",
    template: "%s · Magic Frame",
  },
  description:
    "Magic Frame – Smart-Display-Dashboard für Tablets und TVs mit Home-Assistant-, Wetter- und Kalender-Widgets.",
  applicationName: "Magic Frame",
  appleWebApp: {
    capable: true,
    title: "Magic Frame",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;600;700&family=Open+Sans:wght@300;400;600;700&family=Oswald:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&family=Cutive+Mono&family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
