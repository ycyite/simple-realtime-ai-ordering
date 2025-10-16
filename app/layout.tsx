import type { Metadata } from "next";
import { Geist, Geist_Mono, Kranky, DM_Serif_Text } from "next/font/google";
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

const kranky = Kranky({
  weight: "400",
  variable: "--font-kranky",
  subsets: ["latin"],
});

const dmSerifText = DM_Serif_Text({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif-text",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Counter Bell - Restaurant Management",
  description: "AI-powered restaurant ordering management system",
  icons: {
    icon: '/icons/Counter_Bell_Logo.png',
    shortcut: '/icons/Counter_Bell_Logo.png',
    apple: '/icons/Counter_Bell_Logo.png',
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
        className={`${geistSans.variable} ${geistMono.variable} ${kranky.variable} ${dmSerifText.variable} antialiased`}
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
