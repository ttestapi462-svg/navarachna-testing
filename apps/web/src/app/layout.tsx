import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Public_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Navarachna Designer Studio - Admin Portal",
  description: "Enterprise management dashboard for Navarachna Designer Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans light", publicSans.variable)} style={{ colorScheme: "light" }}>
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ colorScheme: "light" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
