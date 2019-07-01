import SnippetsRegistry from './SnippetsRegistry';
import OutputProfile from './OutputProfile';

export type StringCase = '' | 'lower' | 'upper';
export type SyntaxType = 'markup' | 'stylesheet';

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
}

export interface Config {
    type: SyntaxType;
    profile?: ProfileOptions;
    variables?: SnippetsMap;
    snippets?: SnippetsMap;
    options?: Options;
}

export interface ConfigParams {
    /**
     * Type of abbreviation context, `markup` (default) or `stylesheet`. Can be
     * omitted if `.syntax` if given
     */
    type: SyntaxType;

    /** Host syntax */
    syntax: string;

    /** Project ID */
    project?: string;

    /** Text to wrap with abbreviation */
    text?: string | string[];

    /**
     * A function that takes field index and optional placeholder and returns
     * a string field (tabstop) for host editor. For example, a TextMate-style
     * field is `$index` or `${index:placeholder}`
     */
    field?(index: number, placeholder?: string): string;
}

export interface ResolvedConfig extends ConfigParams {
    type: SyntaxType;
    profile: OutputProfile;
    variables: SnippetsMap;
    options: Options;
    snippets: SnippetsRegistry;
}

interface Options {
    // MARKUP OPTIONS

    /** Options for element commenting */
    comment?: {
        /**
         * Enable/disable element commenting: generate comments before open and/or
         * after close tag
         */
        enabled: boolean;

        /**
         * Attributes that should trigger node commenting on specific node,
         * if commenting is enabled
         */
        trigger?: string[];

        /** Template string for comment to be placed *before* opening tag */
        before?: string;

        /**
         * Template string for comment to be placed *after* closing tag.
         * Example: `\n<!-- /[#ID][.CLASS] -->`
         */
        after?: string;
    };

    bem?: {
        /** Enable/disable BEM addon */
        enabled: boolean;

        /** A string for separating elements in output class */
        element?: string;

        /** A string for separating modifiers in output class */
        modifier?: string;
    };

    // STYLESHEET OPTIONS

    /** Enable JSX addon */
    jsx?: boolean;

    /** Use short hex notation where possible, e.g. `#000` instead of `#000000` */
    shortHex?: boolean;

    /** A string between property name and value */
    between?: string;

    /** A string after property value */
    after: string;

    /** A unit suffix to output by default after integer values, 'px' by default */
    intUnit: string;

    /** A unit suffix to output by default after float values, 'em' by default */
    floatUnit: string;

    /**
     * Aliases for custom units in abbreviation. For example, `r: 'rem'` will
     * output `10rem` for abbreviation `10r`
     */
    unitAliases: SnippetsMap;

    /**
     * A float number between 0 and 1 to pick fuzzy-matched abbreviations.
     * Lower value will pick more abbreviations (and less accurate)
     */
    fuzzySearchMinScore: number;
}

export interface RawConfig<T = any> extends RawConfigBase {
    /** Current config format version. Used for automatic migrations in future */
    version: number;

    /**
     * Editor-specific config like keymap or enabled/disabled features.
     * Contents may differ for every editor.
     */
    editor?: T;

    /** Project-specific settings */
    project?: {
        [projectName: string]: RawConfigBase
    };
}

interface RawConfigBase {
    /**
     * Global preferences that configure all `markup` (HTML, XML, Pug etc.)
     * and `stylesheet` (CSS, SASS, LESS etc) syntaxes
     */
    globals?: {
        markup?: Config & { type: never };
        stylesheet?: Config & { type: never };
    };

    /**
     * Syntax-specific preferences. Same contents as either `markup` or `stylesheet`
     * subsection of `globals` section but for given syntax
     */
    syntax?: {
        [syntaxName: string]: Config;
    };
}

interface SnippetsMap {
    [name: string]: string;
}
