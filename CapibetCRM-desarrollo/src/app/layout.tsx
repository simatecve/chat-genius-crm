import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HydrationHandler } from "./components/HydrationHandler";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import ToastContainer from "@/components/ToastContainer";
import "@/utils/suppressHydrationWarning";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beast CRM - CAPIBET",
  description: "Sistema de gestión de relaciones con clientes para CAPIBET",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider>
          <WebSocketProvider>
            <HydrationHandler />
            {children}
            <ToastContainer />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
