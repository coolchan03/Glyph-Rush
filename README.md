<p align="center">
  <img src="./assets/logo.svg" width="112" alt="Glyph Rush logo">
</p>

<h1 align="center">Glyph Rush</h1>

<p align="center"><strong>Read at the speed you understand.</strong></p>

<p align="center">
  <a href="https://coolchan03.github.io/Glyph-Rush/"><strong>Open Glyph Rush →</strong></a>
</p>

Glyph Rush is a privacy-first speed reader that combines RSVP reading, smart phrase chunking, Fast-Font fixation, adaptive pacing, and local document storage.

There is no account to create and no server-side library. Import a document, read, close the tab, and return later to the exact place you stopped.

## What it does

- One-word RSVP, smart phrase, line-chunk, and traditional reading modes
- Learn, Read, and Skim pacing presets
- Adjustable 100–1200 WPM
- Smart pauses for punctuation, numbers, long words, and paragraph boundaries
- Optional +25 WPM/minute training ramp
- Recall checks with adaptive speed changes
- Fast-Font fixation plus system, serif, and monospace alternatives
- PDF, EPUB, DOCX, TXT, Markdown, and HTML import
- Local IndexedDB library with automatic position/settings persistence
- Chapter detection, document search, bookmarks, and saved passages
- 10-second rewind and sentence replay
- Hold Space for an instant context peek
- Reading goals and required-speed calculation
- Session stats and comprehension-adjusted WPM
- Night, light, sepia, and high-contrast themes
- Installable offline PWA for desktop and mobile
- Library backup and restore

## Keyboard controls

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Hold Space | Pause and reveal sentence context |
| ↑ / ↓ | Change speed by 25 WPM |
| Hold Shift | Temporary slowdown |
| R | Rewind about 10 seconds |
| S | Replay current sentence |
| B | Add a bookmark |

## Privacy and saving

Glyph Rush stores imported text, reading positions, settings, bookmarks, and passages in your browser using IndexedDB. Reading material is not uploaded to this GitHub repository or a Glyph Rush server.

Browser storage is device/browser specific. Use **Export backup** if you want a portable copy of your library and progress.

## Supported documents

TXT, Markdown, and HTML are handled directly. DOCX and EPUB are unpacked locally in the browser. PDF text is extracted locally with PDF.js. Image-only/scanned PDFs need OCR, which is planned for a later version.
## Install as an app

Open the live site in a modern browser. On supported browsers, choose **Install app** / **Add to Home screen**. The service worker caches the reader and bundled parsers for offline use.

## Development

Glyph Rush intentionally has no build step. Serve this folder over HTTP and open it in a browser:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Credits

Glyph Rush includes **Fast Sans** from [Born2Root/Fast-Font](https://github.com/Born2Root/Fast-Font), used under its repository license. It also vendors JSZip and PDF.js for local document parsing. Third-party license information is retained in `third_party/`.

Fast/bionic formatting and RSVP are reading tools, not guarantees of improved comprehension. Glyph Rush deliberately includes recall-aware and context-recovery features so speed is not treated as the only goal.

## License

Glyph Rush source code is released under the MIT License. See [LICENSE](./LICENSE).
