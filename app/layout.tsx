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
  title: "Lyra",
  description:
    "Every trade this agent has ever made, written where nobody can change it.",
  openGraph: {
    title: "Lyra",
    description:
      "Every trade this agent has ever made, written where nobody can change it.",
    url: "https://www.lyrabuild.xyz",
    siteName: "Lyra",
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
