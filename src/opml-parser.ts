export interface HeadData {
	title: string;
	dateCreated?: string;
	dateModified?: string;
	ownerName?: string;
	ownerEmail?: string;
	ownerId?: string;
	docs?: string;
	expansionState?: string;
	vertScrollState?: string;
	windowTop?: string;
	windowLeft?: string;
	windowBottom?: string;
	windowRight?: string;
}

export interface OutlineNode {
	text: string;
	attributes: Record<string, string>;
	children: OutlineNode[];
	expanded: boolean;
}

export interface OPMLDocument {
	version: string;
	head: HeadData;
	outlines: OutlineNode[];
}

export class OPMLParser {
	parse(xml: string): OPMLDocument {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, "application/xml");

		const errorNode = xmlDoc.querySelector("parsererror");
		if (errorNode) {
			throw new Error(`OPML parse error: ${errorNode.textContent}`);
		}

		const opmlEl = xmlDoc.documentElement;
		const version = opmlEl.getAttribute("version") ?? "2.0";

		const headEl = xmlDoc.querySelector("opml > head");
		const head = this.parseHead(headEl);

		const bodyEl = xmlDoc.querySelector("opml > body");
		const outlines: OutlineNode[] = [];
		if (bodyEl) {
			for (const child of Array.from(bodyEl.children)) {
				if (child.tagName.toLowerCase() === "outline") {
					outlines.push(this.parseOutline(child));
				}
			}
		}

		return { version, head, outlines };
	}

	private parseHead(headEl: Element | null): HeadData {
		if (!headEl) return { title: "" };

		const get = (tag: string): string | undefined =>
			headEl.querySelector(tag)?.textContent?.trim() ?? undefined;

		return {
			title: get("title") ?? "",
			dateCreated: get("dateCreated"),
			dateModified: get("dateModified"),
			ownerName: get("ownerName"),
			ownerEmail: get("ownerEmail"),
			ownerId: get("ownerId"),
			docs: get("docs"),
			expansionState: get("expansionState"),
			vertScrollState: get("vertScrollState"),
			windowTop: get("windowTop"),
			windowLeft: get("windowLeft"),
			windowBottom: get("windowBottom"),
			windowRight: get("windowRight"),
		};
	}

	private parseOutline(el: Element): OutlineNode {
		const text =
			el.getAttribute("text") ?? el.getAttribute("title") ?? "";

		const attributes: Record<string, string> = {};
		for (const attr of Array.from(el.attributes)) {
			if (attr.name !== "text") {
				attributes[attr.name] = attr.value;
			}
		}

		const children: OutlineNode[] = [];
		for (const child of Array.from(el.children)) {
			if (child.tagName.toLowerCase() === "outline") {
				children.push(this.parseOutline(child));
			}
		}

		return { text, attributes, children, expanded: true };
	}

	serialize(doc: OPMLDocument): string {
		const xmlDoc = activeDocument.implementation.createDocument(
			null,
			"opml",
			null
		);
		const opmlEl = xmlDoc.documentElement;
		opmlEl.setAttribute("version", doc.version);

		const headEl = xmlDoc.createElement("head");
		this.serializeHead(xmlDoc, headEl, doc.head);
		opmlEl.appendChild(headEl);

		const bodyEl = xmlDoc.createElement("body");
		for (const outline of doc.outlines) {
			bodyEl.appendChild(this.serializeOutline(xmlDoc, outline));
		}
		opmlEl.appendChild(bodyEl);

		const serializer = new XMLSerializer();
		const raw = serializer.serializeToString(xmlDoc);
		const cleaned = raw.replace(/ xmlns="[^"]*"/g, "");
		return `<?xml version="1.0" encoding="UTF-8"?>\n${cleaned}\n`;
	}

	private serializeHead(
		xmlDoc: XMLDocument,
		headEl: Element,
		head: HeadData
	): void {
		const add = (tag: string, value: string | undefined) => {
			if (value !== undefined && value !== "") {
				const el = xmlDoc.createElement(tag);
				el.textContent = value;
				headEl.appendChild(el);
			}
		};
		add("title", head.title);
		add("dateCreated", head.dateCreated);
		add("dateModified", head.dateModified);
		add("ownerName", head.ownerName);
		add("ownerEmail", head.ownerEmail);
		add("ownerId", head.ownerId);
		add("docs", head.docs);
		add("expansionState", head.expansionState);
		add("vertScrollState", head.vertScrollState);
		add("windowTop", head.windowTop);
		add("windowLeft", head.windowLeft);
		add("windowBottom", head.windowBottom);
		add("windowRight", head.windowRight);
	}

	private serializeOutline(
		xmlDoc: XMLDocument,
		node: OutlineNode
	): Element {
		const el = xmlDoc.createElement("outline");
		el.setAttribute("text", node.text);

		for (const [key, value] of Object.entries(node.attributes)) {
			el.setAttribute(key, value);
		}

		for (const child of node.children) {
			el.appendChild(this.serializeOutline(xmlDoc, child));
		}

		return el;
	}
}
