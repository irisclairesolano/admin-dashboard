import React from 'react';
import type { Metadata } from "next";
import { Inter, Raleway, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "SIKAP Admin Dashboard",
  description: "Administrative portal for the SIKAP platform",
};

import { ToastProvider } from '@/context/ToastContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('sikap_admin_dark_mode');if(d==='true'||(d===null&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <link href="https://cdn.lineicons.com/4.0/lineicons.css" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${raleway.variable} ${manrope.variable} antialiased`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
