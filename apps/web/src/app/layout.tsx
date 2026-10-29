import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Public_Sans, Baumans } from "next/font/google";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const baumans = Baumans({ weight: "400", subsets: ["latin"], variable: "--font-brand" });

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
    <html lang="en" className={cn("font-sans light", publicSans.variable, baumans.variable)} style={{ colorScheme: "light" }}>
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ colorScheme: "light" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
