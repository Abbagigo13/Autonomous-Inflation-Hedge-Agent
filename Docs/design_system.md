# Design System

## Direction

**Terminal Observatory** is a restrained cyber-finance control room. It uses luminous signal colors only for state, black graphite for trust, compact data cards for scan speed, and a terminal to make autonomy visible.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Graphite | `#090B0F` | page canvas and deep background |
| Panel | `#10141A` | cards and navigation surfaces |
| Acid mint | `#B8FF6A` | protection, success, active controls |
| Electric blue | `#57C7FF` | network, route, and read-only data |
| Amber | `#FFC857` | inflation risk and attention |
| Mist | `#EDF2EE` | primary copy |
| Slate | `#7C8992` | secondary copy |

## Typography

Inter is used for headings and explanatory text. JetBrains Mono is used for token amounts, chain IDs, timestamps, wallet fragments, and terminal output. Labels are 10–11px uppercase with letter spacing. Page headings are 32–40px with tight tracking and restrained weight.

## Components

Cards use a 16px radius, thin low-opacity borders, graphite gradients, and subtle inset highlights. Buttons have an 8px radius, 160ms transitions, and mint fill only for the primary action. Badges are pill-shaped, uppercase, and semantic. The terminal is blacker than the page, with green/blue/amber text keyed to event severity.

## Layout

A 248px desktop rail anchors navigation. The main workspace uses a max width of 1500px and 20–40px gutters. KPI cards form a four-column row on large screens. The chart and insights panel become a stacked flow on smaller widths. The terminal always spans the workspace width.

## Motion

Skeletons shimmer diagonally. The network dot and terminal connection dot pulse softly. New terminal entries scroll into view. Avoid perpetual parallax, bouncing cards, or ornamental motion that competes with the policy signal.

## Voice

Headlines are calm and operational: “Your protection policy is active.” CTAs are direct: “Run hedge agent.” Error copy names the missing prerequisite: “TEXTILE_API_KEY is not configured; cannot request an RFQ corridor.”
