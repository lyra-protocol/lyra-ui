import type { Metadata } from "next";
import "./globals.css";

/*
 * No auth provider, no analytics, no theme script.
 *
 * The terminal is public and stores nothing about the visitor (memo §6), so
 * there is nothing here to authenticate and no session to keep.
 */

export const metadata: Metadata = {
  metadataBase: new URL("https://www.lyrabuild.xyz"),
  title: "Lyrabuild — Scion Systems Ltd",
  description:
    "Lyra is an autonomous trading agent that writes down why she is about to trade, " +
    "before she finds out whether she was right.",
  openGraph: {
    title: "Lyrabuild — Scion Systems Ltd",
    description:
      "Lyra is an autonomous trading agent that writes down why she is about to trade, " +
      "before she finds out whether she was right.",
    url: "https://www.lyrabuild.xyz",
    siteName: "Lyrabuild",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
