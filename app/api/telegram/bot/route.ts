import { NextResponse } from "next/server";

type TelegramGetMe = {
  ok?: boolean;
  result?: { username?: string };
};

export async function GET() {
  const configuredUrl = process.env.NEXT_PUBLIC_LYRA_TELEGRAM_BOT_URL?.trim();
  if (configuredUrl) return NextResponse.json({ ok: true, url: configuredUrl });

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, url: null }, { status: 404 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      next: { revalidate: 3600 },
    });
    const json = (await response.json()) as TelegramGetMe;
    const username = json.result?.username;
    if (!response.ok || !json.ok || !username) throw new Error("Telegram getMe failed");
    return NextResponse.json(
      { ok: true, url: `https://t.me/${username}` },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Telegram bot lookup failed:", error);
    return NextResponse.json({ ok: false, url: null }, { status: 502 });
  }
}
