import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "GospelDrop - Random Acts of Faith",
  description: "Send free Bibles to random US households",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${nunito.className} bg-white text-text-main overflow-x-hidden`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
