# DESIGN.md — Givime (situs anime)

## Direction
**Dark streaming, horizontal cards.** Content-first list: cover normal di kiri, judul+meta di kanan — bukan grid poster vertikal. Referensi vibe: theme retrotube / bokepnoz (dark UI, badge overlay, list rapi).

## Identity
- **Nama:** Givime
- **Feel:** nonton cepat — cari → list horizontal → play
- **Audience:** penonton anime Indonesia

## Dials
`Dial: ENERGY 2 / RHYTHM 2 / MOTION 1`

## Palette (dark streaming)
| Role | Value | Use |
|------|--------|-----|
| Canvas | `#0f0f10` | page bg |
| Surface | `#17171a` | cards |
| Surface-2 | `#1e1e22` | hover, inputs |
| Ink | `#f2f2f3` | primary text |
| Muted | `#9b9ba3` | meta |
| Border | `#2c2c33` | edges |
| Accent | `#25efcd` | CTA, focus, score, active ep |
| Accent-ink | `#062b26` | text on accent |
| Accent-soft | `rgba(37,239,205,.12)` | Ongoing chip |
| Success | `#4ade80` | sparse |

**Cap:** 1 accent (teal) + neutrals. No blue-purple gradient hero, no glow/glass.

## Typography
- Geist / system-ui — 400 body, 600–700 titles
- tabular-nums untuk ep/score
- Scale: 12 / 13 / 14 / 16 / 22 / 28

## Layout rules
- Max width ~1120px; pad 14–24px
- **Card = horizontal row:** thumb 72–84px (aspect 2:3 natural) + body
- Grid: 1 col mobile → 2 col ≥720 → 3 col ≥1100; gap 8–10px
- Radius: 8 cards/inputs, 6 chips/buttons, 999 status pills only
- Nav solid `#121214` + bottom border; logo mark tile teal
- Icons: **inline SVG only** — jangan glyph text (★ ▶ ←)

## Components
- **AnimeCard:** horizontal; cover normal (bukan full-bleed raksasa); play overlay on hover; title 2-line; meta: chip status · Ep (icon eye) · score (icon star)
- **Chips:** Ongoing = accent-soft + teal; Completed = neutral
- **Player:** black 16:9; bar bawah dengan external-link icon
- **Search:** input dark + search icon kiri
- **Empty/error:** icon + cause + next action
- **Detail:** cover 200px left; CTA solid teal `.btn-play`

## Motion
- CSS only; ≤150ms hover
- Play overlay opacity on card hover; no infinite loops

## Forbidden
- Vertical poster-only grid (user reject)
- Text glyphs as icons when SVG exists
- Blue/purple gradient heroes, glassmorphism, fake stats
- Marketing fluff copy

## Copy voice
Plain ID/EN from real data: title, status, episode, score.
