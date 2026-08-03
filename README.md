# lyra-ui

Three pages. No account, no login, no wallet.

| Route | What it is |
|---|---|
| `/` | The record. Every trade Lyra has made, newest first. |
| `/terminal` | The record, plus the live venue tape and what she is watching. |
| `/mcp` | How to read the record from Claude, Cursor or any MCP client. |

## Where the data comes from

Nowhere we control. Venue state is read from Hyperliquid's public API in the
browser; the record is read from Arweave. There is no backend, no database and
no API route — which is the only way "you do not have to trust this page" is
true rather than asserted.

Dependencies: `next`, `react`, `react-dom`.

## Running it

```sh
npm install
npm run dev
```

`NEXT_PUBLIC_LYRA_OWNER` points the record views at an owner key. Without it the
pages render their empty states, which is the correct behaviour before the first
trade exists.

## Design rules

From `REBUILD-MEMO.md` §7, and they are not negotiable:

- **Gold means verifiable.** `#C9A227` appears on marks and links that lead to
  data you can check yourself, and nowhere else. Never decoration.
- **Red and green are for PnL only.** Never UI chrome.
- Monospace with tabular figures for every number.
- One animation: a new trade settling into the record. It respects
  `prefers-reduced-motion`.
- Losses are shown as prominently as wins.
- Empty states say what will appear and when. Never "coming soon".
- Sentence case. No exclamation marks. No "we" — Lyra is a system, not a startup.
