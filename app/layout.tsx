import type { Metadata } from "next";
import { Geist, Geist_Mono, Rubik_Glitch } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalOrderAlertProvider } from "@/contexts/GlobalOrderAlertContext";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rubikGlitch = Rubik_Glitch({
  weight: "400",
  variable: "--font-rubik-glitch",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Counter Bell - Restaurant Management",
  description: "AI-powered restaurant ordering management system",
  icons: {
    icon: '/icons/logo.svg',
    shortcut: '/icons/logo.svg',
    apple: '/icons/bell-light.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rubikGlitch.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <AuthProvider>
            <GlobalOrderAlertProvider>
              {children}
            </GlobalOrderAlertProvider>
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
