import type { Metadata } from "next";
import { LyraPage } from "@/components/lyra-page";

export const metadata: Metadata = {
  title: "Lyra — autonomous trading agent",
  description:
    "She writes down why she is about to trade, before she finds out whether she was right.",
  openGraph: {
    title: "Lyra — autonomous trading agent",
    description:
      "She writes down why she is about to trade, before she finds out whether she was right.",
    url: "https://www.lyrabuild.xyz/lyra",
    images: ["/lyra.jpg"],
  },
};

export default function Page() {
  return <LyraPage />;
}
