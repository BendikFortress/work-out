import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "9-Week Shred",
  description: "Training, tracking and nutrition for a 9-week shred and define plan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-white min-h-screen">
        <Nav />
        <main className="pb-24">{children}</main>
      </body>
    </html>
  );
}
