import { normalizePath, Plugin, TFile } from "obsidian";
import { OPMLView, VIEW_TYPE_OPML } from "./opml-view";
import { OPMLEditorSettings, DEFAULT_SETTINGS } from "./settings";
import { OPMLSettingTab } from "./settings-tab";

const DEFAULT_OPML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>New Outline</title></head>
  <body>
    <outline text="First item"/>
  </body>
</opml>`;

export default class OPMLEditorPlugin extends Plugin {
	settings!: OPMLEditorSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_OPML,
			(leaf) => new OPMLView(leaf, this)
		);

		this.registerExtensions(["opml"], VIEW_TYPE_OPML);

		this.addSettingTab(new OPMLSettingTab(this.app, this));

		this.addRibbonIcon("list-tree", "New OPML outline", async () => {
			const path = normalizePath("untitled.opml");
			const existing = this.app.vault.getAbstractFileByPath(path);
			const file =
				existing instanceof TFile
					? existing
					: await this.app.vault.create(path, DEFAULT_OPML_TEMPLATE);
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		});
	}

	async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Partial<OPMLEditorSettings>;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
