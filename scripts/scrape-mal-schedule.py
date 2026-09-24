#!/usr/bin/env python3
"""Scrape jadwal mingguan MyAnimeList -> lib/mal-schedule.json"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from html import unescape
from pathlib import Path

URL = "https://myanimelist.net/anime/season/schedule"
KEY_MAP = {
    "monday": "senin",
    "tuesday": "selasa",
    "wednesday": "rabu",
    "thursday": "kamis",
    "friday": "jumat",
    "saturday": "sabtu",
    "sunday": "minggu",
}
DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]


def fetch() -> str:
    req = urllib.request.Request(
        URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; GivimeBot/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read().decode("utf-8", errors="ignore")


def parse(raw: str) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {k: [] for k in DAYS}
    blocks = re.split(
        r'class="seasonal-anime-list js-seasonal-anime-list '
        r'js-seasonal-anime-list-key-([a-z]+)"',
        raw,
    )
    for i in range(1, len(blocks), 2):
        day = KEY_MAP.get(blocks[i])
        if not day:
            continue
        body = blocks[i + 1] if i + 1 < len(blocks) else ""
        cards = re.split(
            r'class="js-anime-category-producer seasonal-anime js-seasonal-anime[^"]*"',
            body,
        )
        for card in cards[1:]:
            m = re.search(
                r'<a href="(https://myanimelist\.net/anime/\d+/[^"]+)" '
                r'class="link-title">([^<]+)</a>',
                card,
            )
            if not m:
                continue
            href, title = m.group(1), unescape(m.group(2))
            m_id = re.search(r"/anime/(\d+)/", href)
            mal_id = int(m_id.group(1)) if m_id else None
            m_score = re.search(r'class="js-score">([^<]*)</span>', card)
            score_raw = m_score.group(1).strip() if m_score else ""
            score = score_raw if score_raw not in ("", "0", "N/A") else ""
            m_eps = re.search(r"(\?|\d+)\s*eps", card)
            eps = "" if not m_eps or m_eps.group(1) == "?" else m_eps.group(1)
            m_img = re.search(
                r'<img[^>]+src="(https://cdn\.myanimelist\.net/images/anime/[^"]+)"',
                card,
            )
            if not m_img:
                m_img = re.search(
                    r"(https://cdn\.myanimelist\.net/images/anime/[^\s\"]+)", card
                )
            cover = m_img.group(1) if m_img else ""
            if any(e["malId"] == mal_id for e in result[day]):
                continue
            result[day].append(
                {
                    "malId": mal_id,
                    "title": title,
                    "score": score,
                    "eps": eps,
                    "cover": cover,
                }
            )
    return result


def main() -> int:
    out = Path(__file__).resolve().parent.parent / "lib" / "mal-schedule.json"
    try:
        data = parse(fetch())
    except Exception as exc:  # noqa: BLE001
        print(f"scrape failed: {exc}", file=sys.stderr)
        return 1
    out.write_text(json.dumps(data, ensure_ascii=False) + "\n")
    counts = {k: len(v) for k, v in data.items()}
    print(counts, "total", sum(counts.values()), "->", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
