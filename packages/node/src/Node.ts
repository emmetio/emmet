import Attribute, { AttributeValue, RawAttribute, AttributeName } from './Attribute';

type IncomingAttribute = AttributeName | RawAttribute | Attribute;
type NodeName = string | null;
type NodeValue = string | null;
type AttributeMap = { [name: string]: NodeValue; };

/**
 * A parsed abbreviation AST node. Nodes build up an abbreviation AST tree
 */
export default class Node {
    /** Node (element) name */
    name: NodeName;

    /** Node value (for text nodes) */
    value: NodeValue = null;

    /** Node repeater data */
    repeat?: {
        count: number;
        value?: string;
    };

    /**  Indicates current element is self-closing, e.g. should not contain closing pair */
    selfClosing: boolean = false;

    /** List of node children */
    children: Node[] = [];

    /** Pointer to parent node */
    parent?: Node;

    /** Pointer to next sibling */
    next?: Node;

    /** Pointer to previous sibling */
    previous?: Node;

    attributes: Attribute[] = [];

    /**
     * Creates a new node
     * @param name Node name
     * @param attributes Array of attributes to add
     */
    constructor(name: NodeName = null, attributes?: IncomingAttribute[]) {
        this.name = name;

        if (Array.isArray(attributes)) {
            attributes.forEach(attr => this.setAttribute(attr));
        }
    }

    /**
     * A shorthand to retrieve node attributes as map
     */
    get attributesMap(): AttributeMap {
        return this.attributes.reduce((out, attr) => {
            out[attr.name] = attr.options.boolean ? attr.name : attr.value;
            return out;
        }, {});
    }

    /**
     * Check if current node is a grouping one, e.g. has no actual representation
     * and is used for grouping subsequent nodes only
     */
    get isGroup(): boolean {
        return !this.name && !this.value && !this.attributes.length;
    }

    /**
     * Check if given node is a text-only node, e.g. contains only value
     */
    get isTextOnly(): boolean {
        return !this.name && !!this.value && !this.attributes.length;
    }

    /**
     * Returns first child node
     */
    get firstChild(): Node | undefined {
        return this.children[0];
    }

    /**
     * Returns last child of current node
     */
    get lastChild(): Node | undefined {
        return this.children[this.children.length - 1];
    }

    /**
     * Return index of current node in its parent child list
     * @return Returns `-1` if current node is a root one
     */
    get childIndex(): number {
        return this.parent ? this.parent.children.indexOf(this) : -1;
    }

    /**
     * Returns next sibling of current node
     */
    get nextSibling() {
        return this.next;
    }

    /**
     * Returns previous sibling of current node
     */
    get previousSibling() {
        return this.previous;
    }

    /**
     * Returns array of unique class names in current node
     */
    get classList(): string[] {
        const attr = this.getAttribute('class');
        return attr && attr.value
            ? attr.value.split(/\s+/g).filter(uniqueClass)
            : [];
    }

    /**
     * Convenient alias to create a new node instance
     */
    create(name: NodeName, attributes?: Attribute[]) {
        return new Node(name, attributes);
    }

    /**
     * Sets given attribute for current node
     * @param name Attribute name or attribute object
     * @param value Attribute value
     */
    setAttribute(name: IncomingAttribute, value?: AttributeValue) {
        const attr = createAttribute(name, value);
        const curAttr = this.getAttribute(name);
        if (curAttr) {
            this.replaceAttribute(curAttr, attr);
        } else {
            this.attributes.push(attr);
        }
    }

    /**
     * Check if attribute with given name exists in node
     */
    hasAttribute(name: string): boolean {
        return !!this.getAttribute(name);
    }

    /**
     * Returns attribute object by given name
     */
    getAttribute(name: IncomingAttribute): Attribute | undefined {
        if (name && typeof name === 'object') {
            name = name.name;
        }

        return this.attributes.find(attr => attr.name === name);
    }

    /**
     * Replaces attribute with new instance
     * @param curAttribute Current attribute name or instance to replace
     * @param newName New attribute name or attribute object
     * @param newValue New attribute value
     */
    replaceAttribute(curAttribute: IncomingAttribute, newName: IncomingAttribute, newValue?: AttributeValue) {
        const attr = curAttribute instanceof Attribute
            ? curAttribute
            : this.getAttribute(curAttribute)!;

        const ix = this.attributes.indexOf(attr);
        if (ix !== -1) {
            this.attributes.splice(ix, 1, createAttribute(newName, newValue));
        }
    }

    /**
     * Removes attribute with given name
     * @param attribute Attribute name or instance to remove
     */
    removeAttribute(attribute: IncomingAttribute) {
        const attr = attribute instanceof Attribute
            ? attribute
            : this.getAttribute(attribute)!;

        const ix = this.attributes.indexOf(attr);
        if (ix !== -1) {
            this.attributes.splice(ix, 1);
        }
    }

    /**
     * Removes all attributes from current node
     */
    clearAttributes() {
        this.attributes.length = 0;
    }

    /**
     * Adds given class name to class attribute
     * @param token Class name token
     */
    addClass(token: string) {
        token = normalize(token);

        if (!this.hasAttribute('class')) {
            this.setAttribute('class', token);
        } else if (token && !this.hasClass(token)) {
            this.setAttribute('class', this.classList.concat(token).join(' '));
        }
    }

    /**
     * Check if current node contains given class name
     * @param token Class name token
     */
    hasClass(token: string): boolean {
        return this.classList.includes(normalize(token));
    }

    /**
     * Removes given class name from class attribute
     * @param token Class name token
     */
    removeClass(token: string) {
        token = normalize(token);
        if (this.hasClass(token)) {
            this.setAttribute('class', this.classList.filter(name => name !== token).join(' '));
        }
    }

    /**
     * Appends child to current node
     */
    appendChild(node: Node) {
        this.insertAt(node, this.children.length);
    }

    /**
     * Inserts given `newNode` before `refNode` child node
     */
    insertBefore(newNode: Node, refNode: Node) {
        this.insertAt(newNode, this.children.indexOf(refNode));
    }

    /**
     * Insert given `node` at `pos` position of child list
     */
    insertAt(node: Node, pos: number) {
        if (pos < 0 || pos > this.children.length) {
            throw new Error('Unable to insert node: position is out of child list range');
        }

        const prev = this.children[pos - 1];
        const next = this.children[pos];

        node.remove();
        node.parent = this;
        this.children.splice(pos, 0, node);

        if (prev) {
            node.previous = prev;
            prev.next = node;
        }

        if (next) {
            node.next = next;
            next.previous = node;
        }
    }

    /**
     * Removes given child from current node
     * @param {Node} node
     */
    removeChild(node: Node) {
        const ix = this.children.indexOf(node);
        if (ix !== -1) {
            this.children.splice(ix, 1);
            if (node.previous) {
                node.previous.next = node.next;
            }

            if (node.next) {
                node.next.previous = node.previous;
            }

            node.parent = node.next = node.previous = void 0;
        }
    }

    /**
     * Removes current node from its parent
     */
    remove() {
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    /**
     * Creates a detached copy of current node
     * @param {Boolean} deep Clone node contents as well
     * @return {Node}
     */
    clone(deep?: boolean): Node {
        const clone = new Node(this.name);
        clone.value = this.value;
        clone.selfClosing = this.selfClosing;
        if (this.repeat) {
            clone.repeat = { ...this.repeat };
        }

        this.attributes.forEach(attr => clone.setAttribute(attr.clone()));

        if (deep) {
            this.children.forEach(child => clone.appendChild(child.clone(true)));
        }

        return clone;
    }

    /**
     * Walks on each descendant node and invokes given `fn` function on it.
     * The function receives two arguments: the node itself and its depth level
     * from current node. If function returns `false`, it stops walking
     * @param {Function} fn
     */
    walk(fn: (ctx: Node, level: number) => any, level: number = 0): boolean | void {
        level = level || 0;
        let ctx = this.firstChild;

        while (ctx) {
            // in case if context node will be detached during `fn` call
            const next = ctx.next;

            if (fn(ctx, level) === false || ctx.walk(fn, level + 1) === false) {
                return false;
            }

            ctx = next;
        }
    }

    /**
     * A helper method for transformation chaining: runs given `fn` function on
     * current node and returns the same node
     */
    use(fn: (node: Node, ...args: any[]) => void, ...args: any[]) {
        fn.apply(null, [this].concat(args));
        return this;
    }

    toString(): string {
        const attrs = this.attributes.map(attr => {
            const opt = attr.options;
            let out = `${opt && opt.implied ? '!' : ''}${attr.name || ''}`;
            if (opt && opt.boolean) {
                out += '.';
            } else if (attr.value != null) {
                out += `="${attr.value}"`;
            }
            return out;
        });

        let out = `${this.name || ''}`;
        if (attrs.length) {
            out += `[${attrs.join(' ')}]`;
        }

        if (this.value != null) {
            out += `{${this.value}}`;
        }

        if (this.selfClosing) {
            out += '/';
        }

        if (this.repeat) {
            out += `*${this.repeat.count ? this.repeat.count : ''}`;
            if (this.repeat.value != null) {
                out += `@${this.repeat.value}`;
            }
        }

        return out;
    }
}

/**
 * Attribute factory
 */
function createAttribute(name: IncomingAttribute, value?: AttributeValue): Attribute {
    if (name instanceof Attribute) {
        return name;
    }

    if (name && typeof name === 'object') {
        return new Attribute(name.name, name.value, name.options);
    }

    return new Attribute(name, value);
}

function normalize(str: string): string {
    return String(str).trim();
}

function uniqueClass(item: any, i: number, arr: any[]): boolean {
    return item && arr.indexOf(item) === i;
}
