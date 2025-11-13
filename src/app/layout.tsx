import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-bdt-ice">
      <body
        className={cn(
          "min-h-screen bg-bdt-ice text-bdt-navy antialiased font-sans",
        )}
      >
        {children}
      </body>
    </html>
  );
}
