import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/contexts/SocketContext";
import { BoardStatsProvider } from "@/contexts/BoardStatsContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Euroshub",
  description: "Project management and collaboration tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BoardStatsProvider>
          <SocketProvider>
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: '',
              style: {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '16px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                maxWidth: '420px',
              },
              success: {
                duration: 3500,
                style: {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                },
                iconTheme: {
                  primary: '#ffffff',
                  secondary: '#667eea',
                },
              },
              error: {
                duration: 4500,
                style: {
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: '#ffffff',
                },
                iconTheme: {
                  primary: '#ffffff',
                  secondary: '#f5576c',
                },
              },
              loading: {
                style: {
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: '#ffffff',
                },
                iconTheme: {
                  primary: '#ffffff',
                  secondary: '#4facfe',
                },
              },
            }}
            />
            {children}
          </SocketProvider>
        </BoardStatsProvider>
      </body>
    </html>
  );
}
