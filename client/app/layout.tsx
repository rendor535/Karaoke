import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/user-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karaoke",
  description: "Karaoke app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = null; // w przyszłości pobierzesz z backendu

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 dark:bg-slate-950`}
      >
        <UserProvider user={user}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem  
            disableTransitionOnChange
          >
            <Toaster />
            {children}
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
