# BubbleNotes

A lightweight floating desktop sticky notes app with calendar view for macOS & Windows, built with Electron.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)
![Version](https://img.shields.io/badge/version-2.0.0-blue)

## Features

- **Sticky Notes** — Create colorful, multi-line notes with titles that auto-save as you type
- **6 Color Themes** — Yellow, Blue, Green, Purple, Pink, and frosted Glass
- **Interactive Calendar** — Navigate months and view notes organized by date with colored dots
- **Pin Notes** — Pin important notes to always stay at the top
- **Quick Search** — Instantly search through all notes by title or content
- **Color Filter** — Filter notes by color theme with a single click
- **Always on Top** — Floats over all other windows, never gets buried
- **Minimize to Bubble** — Shrinks into a small draggable floating dot when not in use
- **Persistent Position** — Window position and size are remembered across restarts
- **Glassmorphism UI** — Frosted glass look that blends with your desktop
- **Auto-Save** — Notes save automatically as you type with no manual save needed

## Download

Grab the latest installer from Releases:

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `BubbleNotes-2.0.0-arm64.dmg` |
| Windows | `BubbleNotes Setup 2.0.0.exe` |

## Run from Source

Requires [Node.js](https://nodejs.org) 18+.

```bash
git clone https://github.com/kiran0843/BubbleNotes.git
cd BubbleNotes
npm install
npm start
```

## Build

```bash
# macOS (Apple Silicon + Intel universal)
npm run build:mac

# Windows x64
npm run build:win

# Both platforms
npm run build:all
```

Output files will be in `dist/mac/` and `dist/win/`.

## Usage

| Action | How |
|---|---|
| Create a note | Click **+ New** button |
| Edit a note | Click on any note card |
| Change note color | Use the color circles in the editor bottom bar |
| Pin a note | Click 📌 in the editor |
| Set a date | Click 📅 in the editor to assign a date |
| Delete a note | Click 🗑️ in the editor |
| Search notes | Type in the search bar above the notes list |
| Filter by color | Click a color dot below the search bar |
| View calendar | Click the **📅 Calendar** tab |
| Browse by date | Click any date on the calendar |
| Add note for date | Click **+ Add** on the calendar date panel |
| Minimize to bubble | Click **●** in the top bar |
| Pin on top | Click **▲** in the top bar |
