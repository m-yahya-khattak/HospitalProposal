import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Hospital Capacity & Capital Plan",
  description:
    "Interactive hospital planning: beds, theatres, equipment and CAPEX.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${newsreader.variable} min-h-dvh antialiased`}
    >
      <body className="min-h-dvh bg-[#f7f6f3] font-sans text-foreground">
        <TooltipProvider>
          <div className="min-h-dvh">{children}</div>
        </TooltipProvider>
      </body>
    </html>
  );
}
