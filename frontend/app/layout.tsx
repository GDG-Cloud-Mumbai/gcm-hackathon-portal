import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GDG Cloud Mumbai",
  description: "Hackathon portal for GDG Cloud Mumbai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${googleSansCode.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
