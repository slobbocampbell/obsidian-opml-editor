import { Menu } from "obsidian";
import type { OutlineNode } from "./opml-parser";

export interface TreeCallbacks {
	onEdit: (node: OutlineNode, newText: string) => void;
	onAddChild: (parent: OutlineNode) => void;
	onAddSibling: (node: OutlineNode) => void;
	onDelete: (node: OutlineNode) => void;
	onToggle: (node: OutlineNode) => void;
	onSelect: (node: OutlineNode) => void;
	onReorder: (
		node: OutlineNode,
		newParent: OutlineNode | null,
		newIndex: number
	) => void;
}

export class TreeRenderer {
	private container: HTMLElement;
	private outlines: OutlineNode[];
	private callbacks: TreeCallbacks;
	private nodeElMap = new Map<OutlineNode, HTMLElement>();
	private dragSource: OutlineNode | null = null;

	constructor(
		container: HTMLElement,
		outlines: OutlineNode[],
		callbacks: TreeCallbacks
	) {
		this.container = container;
		this.outlines = outlines;
		this.callbacks = callbacks;
	}

	render(): void {
		this.container.empty();
		this.nodeElMap.clear();
		const listEl = this.container.createDiv({ cls: "opml-tree-root" });
		for (let i = 0; i < this.outlines.length; i++) {
			this.renderNode(this.outlines[i], listEl, 0, null, i);
		}
	}

	focusNode(node: OutlineNode): void {
		const el = this.nodeElMap.get(node);
		if (el) {
			const textEl = el.querySelector<HTMLElement>(".opml-node-text");
			textEl?.focus();
		}
	}

	private renderNode(
		node: OutlineNode,
		parent: HTMLElement,
		depth: number,
		parentNode: OutlineNode | null,
		indexInParent: number
	): void {
		const depthClass = `opml-depth-${depth % 5}`;
		const rowEl = parent.createDiv({ cls: `opml-node ${depthClass}` });
		rowEl.dataset.depth = String(depth);
		this.nodeElMap.set(node, rowEl);

		rowEl.style.paddingLeft = `${depth * 20 + 8}px`;

		const toggleEl = rowEl.createSpan({ cls: "opml-node-toggle" });
		if (node.children.length > 0) {
			toggleEl.textContent = node.expanded ? "▼" : "▶";
			toggleEl.addEventListener("click", (e) => {
				e.stopPropagation();
				this.callbacks.onToggle(node);
			});
		} else {
			toggleEl.textContent = "•";
			toggleEl.addClass("opml-node-toggle--leaf");
		}

		const textEl = rowEl.createSpan({
			cls: "opml-node-text",
			text: node.text,
		});
		textEl.tabIndex = 0;

		textEl.addEventListener("click", (e) => {
			e.stopPropagation();
			this.selectNode(rowEl);
			this.callbacks.onSelect(node);
		});

		textEl.addEventListener("dblclick", (e) => {
			e.stopPropagation();
			this.startEdit(node, textEl);
		});

		textEl.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.startEdit(node, textEl);
			}
		});

		rowEl.addEventListener("contextmenu", (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this.selectNode(rowEl);
			this.callbacks.onSelect(node);
			this.showContextMenu(e, node);
		});

		rowEl.draggable = true;
		rowEl.addEventListener("dragstart", (e: DragEvent) => {
			this.dragSource = node;
			rowEl.addClass("opml-node--dragging");
			if (e.dataTransfer) {
				e.dataTransfer.setData("text/plain", node.text);
				e.dataTransfer.effectAllowed = "move";
			}
		});
		rowEl.addEventListener("dragend", () => {
			this.dragSource = null;
			rowEl.removeClass("opml-node--dragging");
			this.container
				.querySelectorAll(".opml-node--drag-over")
				.forEach((el) => el.removeClass("opml-node--drag-over"));
		});
		rowEl.addEventListener("dragover", (e: DragEvent) => {
			e.preventDefault();
			if (this.dragSource && this.dragSource !== node) {
				rowEl.addClass("opml-node--drag-over");
			}
		});
		rowEl.addEventListener("dragleave", () => {
			rowEl.removeClass("opml-node--drag-over");
		});
		rowEl.addEventListener("drop", (e: DragEvent) => {
			e.preventDefault();
			rowEl.removeClass("opml-node--drag-over");
			if (!this.dragSource || this.dragSource === node) return;
			const siblings = parentNode ? parentNode.children : this.outlines;
			const dropIndex = siblings.indexOf(node);
			if (dropIndex === -1) return;
			this.callbacks.onReorder(this.dragSource, parentNode, dropIndex + 1);
		});

		const note = node.attributes["note"];
		if (note) {
			const noteEl = parent.createDiv({
				cls: `opml-node-note ${depthClass}`,
			});
			noteEl.textContent = note;
			// Align with node text: toggle (16px) + gap (4px) + base padding
			noteEl.style.paddingLeft = `${depth * 20 + 28}px`;
		}

		if (node.children.length > 0 && node.expanded) {
			const childrenEl = parent.createDiv({ cls: "opml-node-children" });
			for (let i = 0; i < node.children.length; i++) {
				this.renderNode(
					node.children[i],
					childrenEl,
					depth + 1,
					node,
					i
				);
			}
		}

		void indexInParent;
	}

	private selectNode(rowEl: HTMLElement): void {
		this.container
			.querySelectorAll(".opml-node--selected")
			.forEach((el) => el.removeClass("opml-node--selected"));
		rowEl.addClass("opml-node--selected");
	}

	private startEdit(node: OutlineNode, textEl: HTMLElement): void {
		const originalText = node.text;

		const input = this.container.ownerDocument.createElement("input");
		input.type = "text";
		input.value = originalText;
		input.className = "opml-node-edit-input";

		textEl.replaceWith(input);
		input.focus();
		input.select();

		const commit = () => {
			const newText = input.value.trim() || originalText;
			textEl.textContent = newText;
			input.replaceWith(textEl);
			if (newText !== originalText) {
				this.callbacks.onEdit(node, newText);
			}
		};

		const cancel = () => {
			textEl.textContent = originalText;
			input.replaceWith(textEl);
		};

		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				commit();
			} else if (e.key === "Escape") {
				e.preventDefault();
				cancel();
			}
		});
		input.addEventListener("blur", commit);
	}

	private showContextMenu(e: MouseEvent, node: OutlineNode): void {
		const menu = new Menu();

		menu.addItem((item) =>
			item
				.setTitle("Add child")
				.setIcon("corner-down-right")
				.onClick(() => this.callbacks.onAddChild(node))
		);

		menu.addItem((item) =>
			item
				.setTitle("Add sibling below")
				.setIcon("plus")
				.onClick(() => this.callbacks.onAddSibling(node))
		);

		menu.addSeparator();

		menu.addItem((item) =>
			item
				.setTitle("Edit text")
				.setIcon("pencil")
				.onClick(() => {
					const rowEl = this.nodeElMap.get(node);
					const textEl =
						rowEl?.querySelector<HTMLElement>(".opml-node-text");
					if (textEl) this.startEdit(node, textEl);
				})
		);

		menu.addSeparator();

		menu.addItem((item) =>
			item
				.setTitle("Delete")
				.setIcon("trash")
				.onClick(() => this.callbacks.onDelete(node))
		);

		menu.showAtMouseEvent(e);
	}
}
