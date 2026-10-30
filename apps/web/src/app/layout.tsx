import type { Metadata } from "next";
import { Public_Sans, Baumans, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const baumans = Baumans({ weight: "400", subsets: ["latin"], variable: "--font-brand" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Navarachna Designer Studio - Admin Portal",
  description: "Enterprise management dashboard for Navarachna Designer Studio",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
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
        baumans.variable,
        playfair.variable,
        plusJakarta.variable
      )}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#C59B4E]/30 selection:text-[#581124]" style={{ colorScheme: "light" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
