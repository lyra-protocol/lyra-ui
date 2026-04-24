import { NextResponse } from "next/server";
import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { fetchBirdeyeNewListings, fetchBirdeyeTrending, fetchBirdeyeTokenSecurity } from "@/core/server/birdeye/birdeye-client";
import { publishBirdeyeRadarSignals } from "@/core/server/services/birdeye-signal-service";

type Mode = "trending" | "new";

function normalizeNum(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function pickSecuritySummary(raw: Record<string, unknown> | undefined) {
  if (!raw) return null;
  return {
    mutableMetadata: typeof raw.mutableMetadata === "boolean" ? raw.mutableMetadata : null,
    freezeable: typeof raw.freezeable === "boolean" ? raw.freezeable : raw.freezeable == null ? null : Boolean(raw.freezeable),
    top10HolderPercent: normalizeNum(raw.top10HolderPercent),
    jupStrictList: typeof raw.jupStrictList === "boolean" ? raw.jupStrictList : null,
  };
}

function computeScore(input: {
  liquidityUSD: number | null;
  volume24hUSD: number | null;
  price24hChangePercent: number | null;
  security: ReturnType<typeof pickSecuritySummary>;
}) {
  let score = 50;
  const why: string[] = [];
  const warnings: string[] = [];

  if (input.liquidityUSD != null) {
    if (input.liquidityUSD >= 250_000) {
      score += 12;
      why.push("Strong liquidity");
    } else if (input.liquidityUSD >= 50_000) {
      score += 6;
      why.push("Decent liquidity");
    } else if (input.liquidityUSD < 10_000) {
      score -= 15;
      warnings.push("Very low liquidity");
    }
  }

  if (input.volume24hUSD != null) {
    if (input.volume24hUSD >= 1_000_000) {
      score += 10;
      why.push("High 24h volume");
    } else if (input.volume24hUSD < 50_000) {
      score -= 6;
      warnings.push("Low 24h volume");
    }
  }

  if (input.price24hChangePercent != null) {
    if (input.price24hChangePercent >= 50) {
      score += 6;
      why.push("Strong momentum (24h)");
    } else if (input.price24hChangePercent <= -25) {
      score -= 6;
      warnings.push("Downtrend (24h)");
    }
  }

  if (input.security) {
    if (input.security.jupStrictList === true) {
      score += 6;
      why.push("On Jupiter strict list");
    } else if (input.security.jupStrictList === false) {
      score -= 4;
      warnings.push("Not on Jupiter strict list");
    }

    if (input.security.mutableMetadata === true) {
      score -= 6;
      warnings.push("Mutable metadata");
    }

    if (input.security.freezeable === true) {
      score -= 8;
      warnings.push("Freezeable token");
    }

    if (input.security.top10HolderPercent != null) {
      if (input.security.top10HolderPercent >= 0.6) {
        score -= 14;
        warnings.push("Top holders concentration is high");
      } else if (input.security.top10HolderPercent <= 0.25) {
        score += 6;
        why.push("Healthy distribution (top holders)");
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, why: why.length ? why : ["Scored from liquidity, volume, momentum, and security signals"], warnings };
}

export async function POST(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    const body = (await request.json().catch(() => ({}))) as Partial<{ mode: Mode; limit: number }>;
    const mode: Mode = body.mode === "new" ? "new" : "trending";
    const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 20);

    const raw =
      mode === "new"
        ? (await fetchBirdeyeNewListings({ limit, meme_platform_enabled: true })).data?.items?.map((t) => ({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            logoURI: t.logoURI ?? null,
            liquidityUSD: t.liquidity != null && Number.isFinite(t.liquidity) ? t.liquidity : null,
            priceUSD: null,
            price24hChangePercent: null,
            volume24hUSD: null,
          })) ?? []
        : (await fetchBirdeyeTrending({ limit, interval: "24h", sort_by: "rank", sort_type: "asc" })).data?.tokens?.map(
            (t) => ({
              address: t.address,
              symbol: t.symbol,
              name: t.name,
              logoURI: t.logoURI ?? null,
              liquidityUSD: Number.isFinite(t.liquidity) ? t.liquidity : null,
              priceUSD: Number.isFinite(t.price) ? t.price : null,
              price24hChangePercent: Number.isFinite(t.price24hChangePercent) ? t.price24hChangePercent : null,
              volume24hUSD: Number.isFinite(t.volume24hUSD) ? t.volume24hUSD : null,
            })
          ) ?? [];

    const enriched = await Promise.all(
      raw.map(async (t: {
        address: string;
        symbol: string;
        name: string;
        logoURI: string | null;
        liquidityUSD: number | null;
        priceUSD: number | null;
        volume24hUSD: number | null;
        price24hChangePercent: number | null;
      }) => {
        let security: ReturnType<typeof pickSecuritySummary> = null;
        try {
          const sec = await fetchBirdeyeTokenSecurity({ address: t.address, chain: "solana" });
          security = pickSecuritySummary(sec.data);
        } catch {
          security = null;
        }
        const scoring = computeScore({
          liquidityUSD: t.liquidityUSD,
          volume24hUSD: t.volume24hUSD,
          price24hChangePercent: t.price24hChangePercent,
          security,
        });
        return { ...t, score: scoring.score, why: scoring.why, warnings: scoring.warnings };
      })
    );

    const top = [...enriched].sort((a, b) => b.score - a.score).slice(0, limit);
    const result = await publishBirdeyeRadarSignals({
      privyUserId: auth.privyUserId,
      mode,
      tokens: top,
    });

    return NextResponse.json({ ok: true, ...result, mode, limit });
  } catch (error) {
    console.error("Birdeye signals route failed:", error);
    const message = error instanceof Error ? error.message : "Unable to publish signals.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

