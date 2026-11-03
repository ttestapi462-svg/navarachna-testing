import type { Metadata } from "next";
import { Public_Sans, Comfortaa, Marcellus, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const comfortaa = Comfortaa({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-brand" });
const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-subtitle" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Navarachna Designer Studio - Admin Portal",
  description: "Enterprise management dashboard for Navarachna Designer Studio",
  icons: {
    icon: [
      { url: "/favicon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon-32x32.png?v=4", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png?v=4", type: "image/png", sizes: "16x16" },
      { url: "/favicon-48x48.png?v=4", type: "image/png", sizes: "48x48" },
      { url: "/icon.png?v=4", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=4", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=4", sizes: "180x180" },
    ],
    shortcut: "/favicon.ico?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans light",
        publicSans.variable,
        comfortaa.variable,
        marcellus.variable,
        playfair.variable,
        plusJakarta.variable
      )}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ colorScheme: "light" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
