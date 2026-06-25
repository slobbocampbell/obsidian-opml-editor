export type LevelColorScheme = "none" | "muted" | "bright" | "colorblind";

export interface OPMLEditorSettings {
	autoSave: boolean;
	autoSaveDelayMs: number;
	defaultExpanded: boolean;
	showRawXmlButton: boolean;
	levelColorScheme: LevelColorScheme;
}

export const DEFAULT_SETTINGS: OPMLEditorSettings = {
	autoSave: true,
	autoSaveDelayMs: 1000,
	defaultExpanded: true,
	showRawXmlButton: true,
	levelColorScheme: "none",
};
