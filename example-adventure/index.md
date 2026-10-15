---
title: "Example Adventure"
description: "A template to copy for your own adventures. Duplicate this folder, swap in your photos, and write your story."
date: 2026-10-01
location: "Toronto, ON"
cover: ./cover.jpg
photos:
  - src: ./photo-1.jpg
    caption: "Captions are optional"
  - src: ./photo-2.jpg
tags: ["example"]
draft: true # drafts only show up in `npm run dev`, never on the live site
---

This is where the story goes. Write it just like a blog post: plain paragraphs, **bold**, lists, links, headings, whatever you like.

## Adding a new adventure

1. Make a new folder in `src/content/adventures/` — the folder name becomes the URL, e.g. `algonquin-2026` → `/adventures/algonquin-2026`.
2. Put an `index.md` in it (copy this one) and drop your photos next to it.
3. Set `cover` to the photo for the card, and list the rest under `photos`.

You can also drop a photo right into the middle of the story:

![The train pulling in](./photo-2.jpg)

Then keep writing after it.
