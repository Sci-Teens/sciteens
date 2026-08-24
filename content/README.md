# Content

Articles and courses live here as markdown. There is no CMS. To publish, open
a pull request.

- `content/articles/<slug>.md` renders at `/article/<slug>`
- `content/courses/<slug>.md` renders at `/course/<slug>`
- `content/banner.json` controls the site-wide banner
- Images and PDFs live in `public/content/media/` and `public/content/files/`

Run `pnpm dev` and open `/articles` to preview your change.

## The filename is the URL, and it is permanent

The filename becomes the slug. The slug is also the Firestore key for the
comment thread at `article/<slug>/discussion`. If you rename a file, you break
every inbound link and you orphan the comments. Pick the name once.

Use lowercase letters, digits, and hyphens.

## Article frontmatter

```yaml
---
title: 'TL;DR Science: Prosthetics'
date: '2023-12-15'
author: Srishti S.
description: >-
  One or two sentences. The listing card shows the first 200 characters.
tags:
  - Biology
  - Medicine
cover: /content/media/my-cover-image.webp
author_bio: >-
  A short bio. This is markdown, so [links](https://example.com) work.
author_headshot: /content/media/my-headshot.webp
---
```

`title`, `date`, `author`, and `cover` are required. The build fails with the
file name and the missing field if one is absent.

`tags` must come from the topic list in `context/helpers.js#getTranslatedFieldsDict`.
A tag outside that list still renders, but it shows the raw string instead of a
translated label.

`author_bio` and `author_headshot` produce the "About The Author" card. Omit
both to leave the card out.

## Course frontmatter

Courses add `start`, `end`, `enroll_by`, a `lessons` list, and an optional
`files` list. Omit the dates to render the course as self paced.

```yaml
lessons:
  - date: '2021-07-12T13:00:00+0000'
    title: Intro to Physics Concepts
    link: https://example.com/notebook.ipynb
files:
  - name: Day 1.pdf
    path: /content/files/day-1.pdf
```

## Images

Add the file to `public/content/media/` and reference it by path. The build
reads the width and height off the file, so no frontmatter is needed for
dimensions.

Convert to WebP first, at the width the layout actually uses:

| Use                   | Width      |
| --------------------- | ---------- |
| Cover                 | 1200       |
| Image inside the body | up to 1600 |
| Headshot              | 256        |

```bash
cwebp -q 80 -resize 1200 0 source.png -o public/content/media/my-cover-image.webp
```

Images are served straight from `public/`, not through `next/image`, so the
file you commit is the file a reader downloads. A 4 MB screenshot is a 4 MB
download.

**Never overwrite an existing file in `public/content/media/`.** Those paths
are served with `Cache-Control: immutable` for one year, so browsers and the
CDN will keep the old bytes. To replace an image, add it under a new filename
and update the reference.

## Alt text

Write alt text for every image that carries meaning:

```markdown
![A diagram of the four heart chambers](/content/media/heart-diagram.webp)
```

Leave it empty (`![]`) only when the image is decorative, or when the caption
next to it already says the same thing.

Most images migrated from the old CMS have no alt text, because none was ever
entered there. That is a known gap. If you touch an article, add alt text to
its images.

## Embeds and interviews

Two directives are available. Anything else is plain markdown.

A video:

```markdown
::embed{url="https://www.youtube.com/embed/VIDEO_ID" title="What this shows"}
```

Only YouTube, Vimeo, SoundCloud, and Spotify embed origins are accepted, over
HTTPS. See `lib/contentUrls.mjs`. Any other URL renders as a plain link
instead of a frame.

An interview block:

```markdown
:::interview{name="Jane Doe, Biology, MIT" headshot="/content/media/jane.webp"}
What drew you to the field?

_The answer, in italics._
:::
```

## Raw HTML does not work

HTML in a markdown file is dropped, on purpose. The site sets a Content
Security Policy that still allows inline scripts for the framework's own
bootstrap, so raw HTML from a content file would be a script execution risk.
Links with a `javascript:` or `data:` target are stripped for the same reason.

If you need something markdown cannot express, add a directive and a component
for it rather than reaching for HTML.
