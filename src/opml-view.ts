import { Notice, TextFileView, WorkspaceLeaf } from "obsidian";
import type OPMLEditorPlugin from "./main";
import { OPMLParser, OPMLDocument, OutlineNode } from "./opml-parser";
import { TreeRenderer } from "./tree-renderer";
import { DetailPanel } from "./detail-panel";

export const VIEW_TYPE_OPML = "opml-editor-view";

export class OPMLView extends TextFileView {
	private plugin: OPMLEditorPlugin;
	private parser: OPMLParser;
	private doc: OPMLDocument | null = null;
	private renderer: TreeRenderer | null = null;
	private detailPanel: DetailPanel | null = null;
	private saveDebounceTimer: ReturnType<typeof window.setTimeout> | null =
		null;

	private toolbarEl!: HTMLDivElement;
	private treeEl!: HTMLDivElement;
	private detailEl!: HTMLDivElement;
	private rawEl!: HTMLTextAreaElement;
	private isRawMode = false;

	constructor(leaf: WorkspaceLeaf, plugin: OPMLEditorPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.parser = new OPMLParser();
	}

	getViewType(): string {
		return VIEW_TYPE_OPML;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "OPML Editor";
	}

	getIcon(): string {
		return "list-tree";
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) {
			this.doc = null;
			this.isRawMode = false;
		}

		try {
			this.doc = this.parser.parse(data);
			if (this.plugin.settings.defaultExpanded) {
				this.setAllExpanded(this.doc.outlines, true);
			}
		} catch (e) {
			this.doc = null;
			console.error("OPML parse error:", e);
			this.showRawMode(data);
			return;
		}

		if (this.treeEl) {
			this.treeEl.removeClass("opml-hidden");
			this.rawEl.addClass("opml-hidden");
			this.isRawMode = false;
			this.render();
		}
	}

	getViewData(): string {
		if (this.isRawMode) {
			return this.rawEl.value;
		}
		if (!this.doc) return "";
		return this.parser.serialize(this.doc);
	}

	clear(): void {
		this.doc = null;
		if (this.treeEl) this.treeEl.empty();
		if (this.detailPanel) this.detailPanel.hide();
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("opml-editor-view");

		this.toolbarEl = container.createDiv({ cls: "opml-toolbar" });
		this.buildToolbar();

		this.treeEl = container.createDiv({ cls: "opml-tree" });

		// starts hidden; DetailPanel.show() / .hide() manage visibility
		this.detailEl = container.createDiv({
			cls: "opml-detail-panel opml-hidden",
		});
		this.detailPanel = new DetailPanel(this.detailEl, (node) => {
			this.onAttributesChanged(node);
		});

		// starts hidden; toggled by showRawMode / toggleRawMode
		this.rawEl = container.createEl("textarea", {
			cls: "opml-raw-xml opml-hidden",
		});
		this.rawEl.addEventListener("input", () => this.scheduleSave());

		this.registerDomEvent(activeDocument, "keydown", (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.key === "s" &&
				this.isActiveView()
			) {
				e.preventDefault();
				void this.saveFile();
			}
		});
	}

	async onClose(): Promise<void> {
		if (this.saveDebounceTimer) {
			window.clearTimeout(this.saveDebounceTimer);
			this.saveDebounceTimer = null;
		}
		this.renderer = null;
		this.detailPanel = null;
	}

	private buildToolbar(): void {
		const collapseBtn = this.toolbarEl.createEl("button", {
			cls: "opml-toolbar-btn",
			text: "Collapse All",
		});
		collapseBtn.addEventListener("click", () => {
			if (this.doc) {
				this.setAllExpanded(this.doc.outlines, false);
				this.render();
			}
		});

		const expandBtn = this.toolbarEl.createEl("button", {
			cls: "opml-toolbar-btn",
			text: "Expand All",
		});
		expandBtn.addEventListener("click", () => {
			if (this.doc) {
				this.setAllExpanded(this.doc.outlines, true);
				this.render();
			}
		});

		const addRootBtn = this.toolbarEl.createEl("button", {
			cls: "opml-toolbar-btn",
			text: "+ Root",
		});
		addRootBtn.addEventListener("click", () => {
			if (!this.doc) return;
			const newNode: OutlineNode = {
				text: "New item",
				attributes: {},
				children: [],
				expanded: true,
			};
			this.doc.outlines.push(newNode);
			this.render();
			this.scheduleSave();
			this.renderer?.focusNode(newNode);
		});

		if (this.plugin.settings.showRawXmlButton) {
			const rawBtn = this.toolbarEl.createEl("button", {
				cls: "opml-toolbar-btn opml-toolbar-btn--right",
				text: "Raw XML",
			});
			rawBtn.addEventListener("click", () => this.toggleRawMode());
		}
	}

	updatePaletteClass(): void {
		const schemes = ["none", "muted", "bright", "colorblind"];
		schemes.forEach((s) => this.treeEl.removeClass(`opml-palette-${s}`));
		const scheme = this.plugin.settings.levelColorScheme;
		if (scheme !== "none") {
			this.treeEl.addClass(`opml-palette-${scheme}`);
		}
	}

	private render(): void {
		if (!this.doc) return;

		this.updatePaletteClass();
		this.treeEl.empty();
		this.renderer = new TreeRenderer(this.treeEl, this.doc.outlines, {
			onEdit: (node, newText) => this.onNodeEdited(node, newText),
			onAddChild: (parent) => this.onAddChild(parent),
			onAddSibling: (node) => this.onAddSibling(node),
			onDelete: (node) => this.onDelete(node),
			onToggle: (node) => this.onToggle(node),
			onSelect: (node) => this.onSelect(node),
			onReorder: (node, newParent, newIndex) =>
				this.onReorder(node, newParent, newIndex),
		});
		this.renderer.render();
	}

	private onNodeEdited(node: OutlineNode, newText: string): void {
		node.text = newText;
		this.scheduleSave();
	}

	private onAttributesChanged(_node: OutlineNode): void {
		this.scheduleSave();
	}

	private onAddChild(parent: OutlineNode): void {
		const newNode: OutlineNode = {
			text: "New item",
			attributes: {},
			children: [],
			expanded: true,
		};
		parent.children.push(newNode);
		parent.expanded = true;
		this.render();
		this.scheduleSave();
		this.renderer?.focusNode(newNode);
	}

	private onAddSibling(node: OutlineNode): void {
		if (!this.doc) return;
		const newNode: OutlineNode = {
			text: "New item",
			attributes: {},
			children: [],
			expanded: true,
		};
		const inserted = this.insertSiblingAfter(
			this.doc.outlines,
			node,
			newNode
		);
		if (inserted) {
			this.render();
			this.scheduleSave();
			this.renderer?.focusNode(newNode);
		}
	}

	private onDelete(node: OutlineNode): void {
		if (!this.doc) return;
		this.removeNode(this.doc.outlines, node);
		if (this.detailPanel) this.detailPanel.hide();
		this.render();
		this.scheduleSave();
	}

	private onToggle(node: OutlineNode): void {
		node.expanded = !node.expanded;
		this.render();
	}

	private onSelect(node: OutlineNode): void {
		this.detailPanel?.show(node);
	}

	private onReorder(
		node: OutlineNode,
		newParent: OutlineNode | null,
		newIndex: number
	): void {
		if (!this.doc) return;
		this.removeNode(this.doc.outlines, node);
		const siblings = newParent ? newParent.children : this.doc.outlines;
		siblings.splice(newIndex, 0, node);
		this.render();
		this.scheduleSave();
	}

	private scheduleSave(): void {
		if (!this.plugin.settings.autoSave) return;
		if (this.saveDebounceTimer)
			window.clearTimeout(this.saveDebounceTimer);
		this.saveDebounceTimer = window.setTimeout(() => {
			void this.saveFile();
		}, this.plugin.settings.autoSaveDelayMs);
	}

	private async saveFile(): Promise<void> {
		if (!this.file) return;
		const content = this.getViewData();
		await this.app.vault.modify(this.file, content);
	}

	private isActiveView(): boolean {
		return this.app.workspace.getActiveViewOfType(OPMLView) === this;
	}

	private toggleRawMode(): void {
		if (this.isRawMode) {
			try {
				this.doc = this.parser.parse(this.rawEl.value);
				this.rawEl.addClass("opml-hidden");
				this.treeEl.removeClass("opml-hidden");
				this.isRawMode = false;
				this.render();
			} catch {
				new Notice(
					"Invalid XML — fix errors before switching to tree view."
				);
			}
		} else {
			this.showRawMode(this.getViewData());
		}
	}

	private showRawMode(xml: string): void {
		this.treeEl.addClass("opml-hidden");
		this.detailEl.addClass("opml-hidden");
		this.rawEl.value = xml;
		this.rawEl.removeClass("opml-hidden");
		this.isRawMode = true;
	}

	private removeNode(
		outlines: OutlineNode[],
		target: OutlineNode
	): boolean {
		const idx = outlines.indexOf(target);
		if (idx !== -1) {
			outlines.splice(idx, 1);
			return true;
		}
		for (const node of outlines) {
			if (this.removeNode(node.children, target)) return true;
		}
		return false;
	}

	private insertSiblingAfter(
		outlines: OutlineNode[],
		target: OutlineNode,
		newNode: OutlineNode
	): boolean {
		const idx = outlines.indexOf(target);
		if (idx !== -1) {
			outlines.splice(idx + 1, 0, newNode);
			return true;
		}
		for (const node of outlines) {
			if (this.insertSiblingAfter(node.children, target, newNode))
				return true;
		}
		return false;
	}

	private setAllExpanded(
		outlines: OutlineNode[],
		expanded: boolean
	): void {
		for (const node of outlines) {
			node.expanded = expanded;
			if (node.children.length > 0) {
				this.setAllExpanded(node.children, expanded);
			}
		}
	}
}
