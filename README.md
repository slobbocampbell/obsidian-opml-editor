# OPML Editor for Obsidian

View and edit OPML (Outline Processor Markup Language) files as interactive, collapsible outline trees directly inside Obsidian.

## Features

- Opens `.opml` files in a dedicated tree-view editor
- Expand/collapse outline nodes with a single click
- Double-click any node to edit its text label in-place
- Right-click context menu: add child, add sibling, delete node
- Drag-and-drop to reorder nodes
- Click a node to inspect and edit its attributes (type, xmlUrl, htmlUrl, and any custom attributes) in a panel below the tree
- Toggle to raw XML view for direct editing
- Auto-saves with configurable debounce delay
- Cmd+S / Ctrl+S manual save
- Adapts to any Obsidian theme (uses CSS variables throughout)

## Installation

### Community plugin store

Search for **OPML Editor** in Settings → Community Plugins → Browse.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Create a folder at `<vault>/.obsidian/plugins/opml-editor/`.
3. Copy the three files into that folder.
4. Enable the plugin in Settings → Community Plugins.

## Usage

1. Enable the plugin.
2. Open any `.opml` file from the file explorer — it opens automatically in the OPML Editor.
3. Use the toolbar to collapse all / expand all nodes, add a root-level node, or toggle the raw XML view.
4. Right-click any node for the context menu.

## Settings

| Setting | Default | Description |
|---|---|---|
| Auto-save | On | Save changes after a short period of inactivity. |
| Auto-save delay | 1000 ms | How long to wait before auto-saving (100–5000 ms). |
| Expand all on open | On | Show all nodes expanded when opening a file. |
| Show Raw XML button | On | Show a button to toggle between tree and raw XML views. |

## Development

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/opml-editor-obsidian
cd opml-editor-obsidian
npm install
npm run dev
```

Then symlink (or copy) `main.js`, `manifest.json`, and `styles.css` into your test vault's `.obsidian/plugins/opml-editor/` folder and reload Obsidian.

## License

MIT — see [LICENSE](LICENSE).
