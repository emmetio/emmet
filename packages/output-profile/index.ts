/** String output case: lower, upper or '' (keep as-is) */
export type StringCase = '' | 'lower' | 'upper';

// FIXME use actual type
interface EmmetAttribute {
    options: { boolean: boolean; };
    name: string;
    value: string;
}

interface EmmetNode {
    name?: string;
    isTextOnly: boolean;
}

export interface ProfileOptions {
    /** String for one-level indentation. For example, `\t` or `  ` (N spaces) */
    indent: string;

    /** Tag case: lower, upper or '' (keep as-is) */
    tagCase: StringCase;

    /** Attribute name case: lower, upper or '' (keep as-is) */
    attributeCase: StringCase;

    /** Attribute value quotes: 'single' or 'double' */
    attributeQuotes: 'single' | 'double';

    /** Enable output formatting (indentation and line breaks) */
    format: boolean;

    /** A list of tag names that should not get inner indentation */
    formatSkip: string[];

    /** A list of tag names that should *always* get inner indentation. */
    formatForce: string[];

    /**
     * How many inline sibling elements should force line break for each tag.
     * Set to 0 to output all inline elements without formatting.
     * Set to 1 to output all inline elements with formatting (same as block-level).
     */
    inlineBreak: number;

    /**
     * Produce compact notation of boolean attributes: attributes where name equals value.
     * With this option enabled, output `<div contenteditable>` instead of
     * `<div contenteditable="contenteditable">`
     */
    compactBooleanAttributes: boolean;

    /** A set of boolean attributes */
    booleanAttributes: string[];

    /** Style of self-closing tags: html (`<br>`), xml (`<br/>`) or xhtml (`<br />`) */
    selfClosingStyle: 'html' | 'xml' | 'xhtml';

    /** A set of inline-level elements */
    inlineElements: string[];

    /**
     * A function that takes field index and optional placeholder and returns
     * a string field (tabstop) for host editor. For example, a TextMate-style
     * field is `$index` or `${index:placeholder}`
     */
    field?(index: number, placeholder?: string): string;
}

export const defaultProfile: ProfileOptions = {
    indent: '\t',
    tagCase: '',
    attributeCase: '',
    attributeQuotes: 'double',
    format: true,
    formatSkip: ['html'],
    formatForce: ['body'],
    inlineBreak: 3,
    compactBooleanAttributes: false,
    booleanAttributes: [
        'contenteditable', 'seamless', 'async', 'autofocus',
        'autoplay', 'checked', 'controls', 'defer', 'disabled', 'formnovalidate',
        'hidden', 'ismap', 'loop', 'multiple', 'muted', 'novalidate', 'readonly',
        'required', 'reversed', 'selected', 'typemustmatch'
    ],
    selfClosingStyle: 'html',
    inlineElements: [
        'a', 'abbr', 'acronym', 'applet', 'b', 'basefont', 'bdo',
        'big', 'br', 'button', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i',
        'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'map', 'object', 'q',
        's', 'samp', 'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
        'textarea', 'tt', 'u', 'var'
    ]
};

/**
 * Creates output profile for given options
 */
export default class EmmetProfile {
    readonly options: ProfileOptions;
    /** Character used for quoting */
    readonly quoteChar: string;

    constructor(options?: Partial<ProfileOptions>) {
        this.options = { ...defaultProfile, ...options };
        this.quoteChar = this.options.attributeQuotes === 'single' ? '\'' : '"';
    }

    /**
     * Returns value of given option name
     */
    get<K extends keyof ProfileOptions>(name: K): ProfileOptions[K] {
        return this.options[name];
    }

    /**
     * Quote given string according to profile options
     */
    quote(str: string): string {
        return `${this.quoteChar}${str != null ? str : ''}${this.quoteChar}`;
    }

    /**
     * Output given tag name according to options
     */
    name(name: string): string {
        return strcase(name, this.options.tagCase);
    }

    /**
     * Outputs attribute name according to current settings
     */
    attribute(attr: string): string {
        return strcase(attr, this.options.attributeCase);
    }

    /**
     * Check if given attribute is boolean
     * @param {Attribute} attr
     * @return {Boolean}
     */
    isBooleanAttribute(attr: EmmetAttribute): boolean {
        return attr.options.boolean
            || this.get('booleanAttributes').includes((attr.name || '').toLowerCase());
    }

    /**
     * Returns a token for self-closing tag, depending on current options
     */
    selfClose(): string {
        switch (this.options.selfClosingStyle) {
            case 'xhtml': return ' /';
            case 'xml': return '/';
            default: return '';
        }
    }

    /**
     * Returns indent for given level
     */
    indent(level: number = 0): string {
        let output = '';
        while (level--) {
            output += this.options.indent;
        }

        return output;
    }

    /**
     * Check if given tag name belongs to inline-level element
     * @param node Parsed node or tag name
     */
    isInline(node: string | EmmetNode): boolean {
        if (typeof node === 'string') {
            return this.get('inlineElements').includes(node.toLowerCase());
        }

        // inline node is a node either with inline-level name or text-only node
        return node.name != null ? this.isInline(node.name) : node.isTextOnly;
    }

    /**
     * Outputs formatted field for given params
     * @param index Field index
     * @param placeholder Field placeholder, can be empty
     */
    field(index: number, placeholder?: string): string {
        const { field } = this.options;
        return field ? field(index, placeholder) : '';
    }
}

function strcase(str: string, type: StringCase) {
    if (type) {
        return type === 'upper' ? str.toUpperCase() : str.toLowerCase();
    }

    return str;
}
