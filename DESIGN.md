# Terminal design

Why the interface looks the way it does. Written before the rebuild, so each
choice has to justify itself rather than be explained afterwards.

---

## What was wrong with the first attempt

Naming it plainly, because the same mistakes recur otherwise.

**There was no system.** Font sizes across the components ran 9.5, 10, 10.5, 11,
11.5, 12, 12.5, 13, 15, 16, 17 and 22px. That is not a scale, it is an
accumulation — each number chosen locally, none related to any other. Spacing was
the same: 10, 14, 16, 18, 20, 22px, arbitrarily.

**Everything was inline.** Styles were written at the point of use, so there was
nowhere for a decision to live and nothing to reuse. A design system is not
decoration; it is the mechanism that stops the tenth component contradicting the
first.

**The most important thing on the page was rendered as filler.** Lyra's reasoning
is the entire product — it is the falsifiable, timestamped output that the whole
project exists to produce — and it was displayed as a truncated grey paragraph
below the fold. That is the opposite of the rule that matters most in dense
interfaces: *hierarchy is earned by importance, not decoration.*

---

## The governing principle

> Every pixel accountable. Hierarchy earned by importance.

Dense interfaces are correct for this audience — someone watching an agent trade
wants to see the state of the world, not a landing page. But density only works
when hierarchy does the heavy lifting: **size, contrast, position and weight**
tell the eye where to go, so nothing needs a border or a colour to be found.

Three consequences:

1. **No decorative colour.** Colour carries exactly two meanings: PnL direction,
   and connection state. Nothing else is coloured, ever.
2. **Weight and size do the work.** A figure that matters is bigger. A label that
   supports it is smaller and lighter. There is no third mechanism.
3. **Borders are structural only.** Hairlines separate regions. They never
   decorate, never round, never shadow.

---

## The insight that reorganises the page

Lyra's decision schema is **already a chain of thought**, and I had been throwing
it away.

```
observed          → what the positions show
losing_side       → longs | shorts | neither
forced_orders_are → buys_above_spot | sells_below_spot
hypothesis        → magnet | wall | cascade
action            → open_long | open_short | hold | close
```

Those fields exist in that order because §4.1 of the root design proved the order
changes the answer: the same model on the same data said *open_short* when it
could name an action directly, and *open_long* when forced to commit to
`losing_side` and `forced_orders_are` first.

So the reasoning is not prose to be summarised. **It is a numbered sequence of
commitments, and the sequence is the evidence.** Rendering it as a paragraph
destroys precisely the property that makes it trustworthy.

The decision card therefore shows each step as a discrete row, numbered, in
order. You watch her commit to a premise before she is allowed to name a trade.
No competing product can show this, because no competing product forces the
commitments in the first place.

---

## Progressive disclosure, three layers

The standard pattern for agent interfaces, and it fits exactly:

| Layer | Content | Default |
|---|---|---|
| 1 | The call — asset, action, conviction | always visible |
| 2 | The commitment chain — the five ordered fields | always visible |
| 3 | Full prose, citations, model, cost, prompt hash | on demand |

Someone scanning sees what she did. Someone sceptical opens layer three and finds
the exact model, the exact inputs by id, and the raw output. Nothing is hidden;
some of it is folded.

---

## Citations are rendered as citations

`evidence_event_ids` is the mechanism that makes "never fabricate" enforceable —
a decision citing an id it was not given is rejected before execution. If that is
true it should be *visible*, so each cited id is shown as a chip beside the
reasoning, and the observation it refers to is available on hover.

A claim with its sources attached looks different from a claim without them, and
it should.

---

## Type

| Role | Size | Weight | Use |
|---|---|---|---|
| Micro | 10px | 500, tracked, uppercase | labels only |
| Body | 12px | 400 | prose, secondary data |
| Data | 13px | 400, mono | every number in a table |
| Emphasis | 15px | 500 | panel values |
| Figure | 20px | 400, mono | account and Pain Map headline numbers |
| Hero | 30px | 400, mono | the one number a panel exists for |

Six sizes. Nothing between them. Numbers are monospace with tabular figures
everywhere without exception, because a column of prices that does not align is
a column that cannot be read.

Spacing is a 4px scale: 4, 8, 12, 16, 24, 32, 48. Nothing else.

---

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ LYRA · asset · watching only                        clock │  48px
├──────────────────────────────────────────────────────────┤
│ universe strip — 8 assets, price, change, funding         │  62px
├────────────────────────────────────────┬─────────────────┤
│ chart, with her levels drawn on it     │ account         │
│                                        │ ─────────────── │
├────────────────────────────────────────┤ order book      │
│ pain map — forced flow curve           │                 │
├────────────────────────────────────────┤                 │
│ ▸ HER REASONING — the tallest panel    │                 │
│   numbered commitment chains           │                 │
└────────────────────────────────────────┴─────────────────┘
```

The reasoning panel is given the most vertical space of anything on the page.
That is the whole argument of this document expressed as a layout: if her
reasoning is the product, it gets the room.

---

## What is deliberately absent

- **No order entry.** Not disabled, not greyed — absent. The panel where a
  terminal puts a buy button holds her account instead, and the header says
  "watching only" once, plainly.
- **No fake activity.** No typing indicators, no simulated cursor, no
  "analysing…" when nothing is being analysed. Where there is no data the panel
  says what will appear and when.
- **No rounded corners, shadows or gradients.** Instruments do not have them.
