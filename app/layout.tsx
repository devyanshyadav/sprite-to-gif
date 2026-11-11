import type { Metadata } from "next";
import { Poppins, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleTagManager } from "@next/third-parties/google";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { buildRootMetadata } from "@/lib/site-seo";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = buildRootMetadata();

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-P25STZSS";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {GTM_ID ? <GoogleTagManager gtmId={GTM_ID} /> : null}
        <SiteJsonLd />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
