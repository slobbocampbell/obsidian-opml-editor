import { normalizePath, Plugin } from "obsidian";
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
			let file = this.app.vault.getFileByPath(path);
			if (!file) {
				file = await this.app.vault.create(
					path,
					DEFAULT_OPML_TEMPLATE
				);
			}
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_OPML);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
