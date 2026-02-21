import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joy Cloud - Secure Storage",
  description: "Secure, professional cloud storage platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
