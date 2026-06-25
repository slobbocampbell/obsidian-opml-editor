import { App, PluginSettingTab, Setting } from "obsidian";
import type OPMLEditorPlugin from "./main";
import { OPMLView, VIEW_TYPE_OPML } from "./opml-view";
import { LevelColorScheme } from "./settings";

export class OPMLSettingTab extends PluginSettingTab {
	plugin: OPMLEditorPlugin;

	constructor(app: App, plugin: OPMLEditorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName("General").setHeading();

		new Setting(containerEl)
			.setName("Auto-save")
			.setDesc("Automatically save changes after a short period of inactivity.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoSave)
					.onChange(async (value) => {
						this.plugin.settings.autoSave = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-save delay (ms)")
			.setDesc("Milliseconds of inactivity before auto-saving (100–5000).")
			.addSlider((slider) =>
				slider
					.setLimits(100, 5000, 100)
					.setValue(this.plugin.settings.autoSaveDelayMs)
					.onChange(async (value) => {
						this.plugin.settings.autoSaveDelayMs = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Expand all nodes on open")
			.setDesc("Show all outline nodes expanded when opening an OPML file.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultExpanded)
					.onChange(async (value) => {
						this.plugin.settings.defaultExpanded = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show Raw XML button")
			.setDesc("Show a button to toggle between tree view and raw XML editing.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showRawXmlButton)
					.onChange(async (value) => {
						this.plugin.settings.showRawXmlButton = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Level colours")
			.setDesc("Highlight each nesting depth with a distinct background colour.")
			.addDropdown((dd) =>
				dd
					.addOption("none", "None")
					.addOption("muted", "Muted")
					.addOption("bright", "Bright")
					.addOption("colorblind", "Color-blindness Friendly")
					.setValue(this.plugin.settings.levelColorScheme)
					.onChange(async (value) => {
						this.plugin.settings.levelColorScheme =
							value as LevelColorScheme;
						await this.plugin.saveSettings();
						this.applyPaletteToOpenViews();
					})
			);
	}

	private applyPaletteToOpenViews(): void {
		this.app.workspace
			.getLeavesOfType(VIEW_TYPE_OPML)
			.forEach((leaf) => {
				if (leaf.view instanceof OPMLView) {
					leaf.view.updatePaletteClass();
				}
			});
	}
}
