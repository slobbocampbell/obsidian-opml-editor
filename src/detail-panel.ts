import type { OutlineNode } from "./opml-parser";

export class DetailPanel {
	private container: HTMLElement;
	private onChanged: (node: OutlineNode) => void;
	private currentNode: OutlineNode | null = null;

	constructor(
		container: HTMLElement,
		onChanged: (node: OutlineNode) => void
	) {
		this.container = container;
		this.onChanged = onChanged;
	}

	show(node: OutlineNode): void {
		this.currentNode = node;
		this.render();
	}

	hide(): void {
		this.currentNode = null;
		this.container.empty();
		this.container.addClass("opml-hidden");
	}

	private render(): void {
		const node = this.currentNode;
		if (!node) return;

		this.container.empty();
		this.container.removeClass("opml-hidden");

		this.container.createEl("div", {
			cls: "opml-detail-heading",
			text: "Attributes — " + node.text,
		});

		const attrKeys = Object.keys(node.attributes);

		if (attrKeys.length === 0) {
			this.container.createEl("p", {
				cls: "opml-detail-empty",
				text: "No additional attributes.",
			});
		} else {
			for (const key of attrKeys) {
				const row = this.container.createDiv({ cls: "opml-detail-row" });
				row.createEl("label", { cls: "opml-detail-label", text: key });
				const input = row.createEl("input", {
					cls: "opml-detail-input",
					type: "text",
				});
				input.value = node.attributes[key];
				input.addEventListener("change", () => {
					if (this.currentNode) {
						this.currentNode.attributes[key] = input.value;
						this.onChanged(this.currentNode);
					}
				});

				const delBtn = row.createEl("button", {
					cls: "opml-detail-del-btn",
					text: "×",
				});
				delBtn.setAttribute("aria-label", `Delete attribute ${key}`);
				delBtn.addEventListener("click", () => {
					if (this.currentNode) {
						delete this.currentNode.attributes[key];
						this.onChanged(this.currentNode);
						this.render();
					}
				});
			}
		}

		const addRow = this.container.createDiv({ cls: "opml-detail-add-row" });
		const keyInput = addRow.createEl("input", {
			cls: "opml-detail-new-key",
			type: "text",
		});
		keyInput.placeholder = "attribute name";
		const valInput = addRow.createEl("input", {
			cls: "opml-detail-new-val",
			type: "text",
		});
		valInput.placeholder = "value";
		const addBtn = addRow.createEl("button", {
			cls: "opml-detail-add-btn",
			text: "Add",
		});
		addBtn.addEventListener("click", () => {
			const k = keyInput.value.trim();
			const v = valInput.value;
			if (k && this.currentNode) {
				this.currentNode.attributes[k] = v;
				this.onChanged(this.currentNode);
				this.render();
			}
		});
	}
}
