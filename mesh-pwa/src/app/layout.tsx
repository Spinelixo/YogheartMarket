 import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/context/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yogheart Market - Marketplace",
  description: "Buy, sell, and trade locally on Yogheart Market",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yogheart Market",
  },
  icons: {
    icon: "/favicon-v3.png",
    apple: "/apple-touch-icon-v3.png",
  },
};

export const viewport: import("next").Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff"
};

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
            __html: `
              try {
                let hasAuth = false;
                try {
                  hasAuth = !!(
                    localStorage.getItem("mesh_session_token") ||
                    localStorage.getItem("mesh_onboarding_complete") === "true" ||
                    Object.keys(localStorage).some(k => k.startsWith("firebase:authUser"))
                  );
                } catch (_) {}

                if (!hasAuth) {
                  document.documentElement.style.background = '#ffffff';
                  return;
                }

                let isDark = false;
                const meshDarkMode = localStorage.getItem('mesh_dark_mode');
                const meshTheme = localStorage.getItem('mesh_theme');
                if (meshDarkMode === 'true' || ['dark', 'glow-dark', 'cyber-glow', 'neon-violet', 'sunset-amber'].includes(meshTheme)) {
                  isDark = true;
                } else if (meshTheme === 'system' || (!meshTheme && !meshDarkMode)) {
                  isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  if (meshTheme === 'cyber-glow') {
                    document.documentElement.classList.add('theme-cyber-glow');
                    document.documentElement.style.background = '#030806';
                  } else if (meshTheme === 'neon-violet') {
                    document.documentElement.classList.add('theme-neon-violet');
                    document.documentElement.style.background = '#080414';
                  } else if (meshTheme === 'sunset-amber') {
                    document.documentElement.classList.add('theme-sunset-amber');
                    document.documentElement.style.background = '#0c0702';
                  } else if (meshTheme === 'glow-dark') {
                    document.documentElement.classList.add('glow-dark');
                    document.documentElement.style.background = '#070913';
                  } else {
                    document.documentElement.style.background = '#0b141a';
                  }
                } else {
                  if (meshTheme === 'light-glow') {
                    document.documentElement.classList.add('theme-light-glow');
                    document.documentElement.style.background = '#f0fdf4';
                  } else if (meshTheme === 'light-green') {
                    document.documentElement.classList.add('theme-light-green');
                    document.documentElement.style.background = '#eef9ea';
                  } else if (meshTheme === 'classic-blue') {
                    document.documentElement.classList.add('theme-classic-blue');
                    document.documentElement.style.background = '#ffffff';
                  } else if (meshTheme === 'glow-light') {
                    document.documentElement.classList.add('glow-light');
                    document.documentElement.style.background = '#fefcf6';
                  } else if (meshTheme === 'whatsapp') {
                    document.documentElement.classList.add('theme-whatsapp');
                    document.documentElement.style.background = '#e4ebd9';
                  } else {
                    document.documentElement.style.background = '#e4ebd9';
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-blue-100 selection:text-blue-900`}
        style={{ margin: 0, padding: 0 }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

