import SnippetsRegistry from './SnippetsRegistry';
import OutputProfile, { OutputProfileOptions } from './OutputProfile';

export type SyntaxType = 'markup' | 'stylesheet';

export interface Config {
    type: SyntaxType;
    profile?: OutputProfileOptions;
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
}

export type FieldOutput = (index: number, placeholder: string, offset: number, line: number, column: number) => string;

export interface ResolvedConfig extends ConfigParams {
    type: SyntaxType;
    profile: OutputProfile;
    variables: SnippetsMap;
    options: Options;
    snippets: SnippetsRegistry;
}

export type Options = Partial<FormatOptions> & Partial<MarkupOptions> & Partial<StylesheetOptions>;

/**
 * Options for formatting abbreviation output
 */
export interface FormatOptions {
    /** A string for one level indent */
    indent: string;

    /**
     * A string for base indent, e.g. context indentation which will be added
     * for every generated line
     */
    baseIndent: string;

    /** A string to use as a new line */
    newline: string;

    /**
     * A function that takes field index and optional placeholder and returns
     * a string field (tabstop) for host editor. For example, a TextMate-style
     * field is `$index` or `${index:placeholder}`
     * @param index Field index
     * @param placeholder Field placeholder (default value), if any
     * @param offset Current character offset from the beginning of generated content
     * @param line Current line of generated output
     * @param column Current column in line
     */
    field: FieldOutput;
}

/**
 * Options for comments addon which adds comments before/after specific HTML element
 */
export interface CommentOptions {
    /**
     * Enable/disable element commenting: generate comments before open and/or
     * after close tag
     */
    enabled: boolean;

    /**
     * Attributes that should trigger node commenting on specific node,
     * if commenting is enabled
     */
    trigger: string[];

    /**
     * Template string for comment to be placed *before* opening tag
     */
    before?: string;

    /**
     * Template string for comment to be placed *after* closing tag.
     * Example: `\n<!-- /[#ID][.CLASS] -->`
     */
    after?: string;
}

/** Options for BEM addon */
export interface BEMOptions {
    /** Enable/disable BEM addon */
    enabled: boolean;

    /** A string for separating elements in output class */
    element: string;

    /** A string for separating modifiers in output class */
    modifier: string;
}

/** Options for JSX addon */
export interface JSXOptions {
    /** Enable/disable JSX addon */
    enabled: boolean;
}

export interface MarkupOptions {
    comment: Partial<CommentOptions>;
    bem: Partial<BEMOptions>;
    jsx: Partial<JSXOptions>;
}

/** Options for stylesheet output formatter */
export interface StylesheetOptions {
    /** Use short hex notation where possible, e.g. `#000` instead of `#000000` */
    shortHex: boolean;

    /** A string between property name and value */
    between: string;

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

    options?: Options;

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

export interface SnippetsMap {
    [name: string]: string;
}
