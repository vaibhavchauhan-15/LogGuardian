import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LogGuardian | Open-Source AI Log Monitoring",
    template: "%s | LogGuardian",
  },
  description:
    "LogGuardian is a production-ready, open-source log monitoring platform with anomaly detection, failure prediction, and real-time alerting.",
  keywords: [
    "log monitoring",
    "anomaly detection",
    "open source observability",
    "fastapi",
    "next.js",
    "devops dashboard",
  ],
  authors: [{ name: "LogGuardian Team" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LogGuardian | Open-Source AI Log Monitoring",
    description:
      "Detect anomalies, predict failures, and respond faster with a free and modern observability platform.",
    type: "website",
    url: siteUrl,
    siteName: "LogGuardian",
  },
  twitter: {
    card: "summary_large_image",
    title: "LogGuardian | Open-Source AI Log Monitoring",
    description:
      "Free and open-source log monitoring with real-time insights, anomaly detection, and alerting.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
    >
      <body className="lg-body">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
