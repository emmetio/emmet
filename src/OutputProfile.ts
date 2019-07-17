import { AbbreviationAttribute, AbbreviationNode } from "@emmetio/abbreviation";

type StringCase = '' | 'lower' | 'upper';

export interface OutputProfileOptions {
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
}

export const defaultProfile: OutputProfileOptions = {
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
export default class OutputProfile {
    readonly options: OutputProfileOptions;
    /** Character used for quoting */
    readonly quoteChar: string;

    constructor(options?: Partial<OutputProfileOptions>) {
        this.options = { ...defaultProfile, ...options };
        this.quoteChar = this.options.attributeQuotes === 'single' ? '\'' : '"';
    }

    /**
     * Returns value of given option name
     */
    get<K extends keyof OutputProfileOptions>(name: K): OutputProfileOptions[K] {
        return this.options[name];
    }

    /**
     * Quote given string according to profile options
     */
    quote(str: string | null): string {
        return `${this.quoteChar}${str != null ? str : ''}${this.quoteChar}`;
    }

    /**
     * Output given tag name according to options
     */
    name(name: string): string {
        return strCase(name, this.options.tagCase);
    }

    /**
     * Outputs attribute name according to current settings
     */
    attribute(attr: string): string {
        return strCase(attr, this.options.attributeCase);
    }

    /**
     * Check if given attribute is boolean
     */
    isBooleanAttribute(attr: AbbreviationAttribute): boolean {
        return attr.boolean
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
    isInline(node: string | AbbreviationNode): boolean {
        if (typeof node === 'string') {
            return this.get('inlineElements').includes(node.toLowerCase());
        }

        // inline node is a node either with inline-level name or text-only node
        return node.name ? this.isInline(node.name) : Boolean(node.value && !node.attributes);
    }
}

function strCase(str: string, type: StringCase) {
    if (type) {
        return type === 'upper' ? str.toUpperCase() : str.toLowerCase();
    }

    return str;
}
