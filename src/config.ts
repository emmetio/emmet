import type { Abbreviation } from '@emmetio/abbreviation';
import markupSnippets from './snippets/html.json' assert { type: 'json' };
import stylesheetSnippets from './snippets/css.json' assert { type: 'json' };
import xslSnippets from './snippets/xsl.json' assert { type: 'json' };
import pugSnippets from './snippets/pug.json' assert { type: 'json' };
import variables from './snippets/variables.json' assert { type: 'json' };
import type { CSSSnippet } from './stylesheet/snippets.js';

export type SyntaxType = 'markup' | 'stylesheet';
export type FieldOutput = (index: number, placeholder: string, offset: number, line: number, column: number) => string;
export type TextOutput = (text: string, offset: number, line: number, column: number) => string;
export type StringCase = '' | 'lower' | 'upper';
export interface SnippetsMap {
    [name: string]: string;
}

export interface AbbreviationContext {
    name: string;
    attributes?: { [name: string]: string | null };
}

/**
 * Raw config which contains per-syntax options. `markup` and `syntax` keys are
 * reserved for global settings for all markup and stylesheet syntaxes
 */
export interface GlobalConfig {
    [syntax: string]: Partial<BaseConfig>;
}

export interface BaseConfig {
    /* Type of abbreviation context, default is `markup` */
    type: SyntaxType;

    /** Options for abbreviation output */
    options: Partial<Options>;

    /** Substitutions for variable names */
    variables: SnippetsMap;

    /** Abbreviation name to snippets mapping */
    snippets: SnippetsMap;
}

interface ResolvedConfig extends BaseConfig {
    /** Host syntax */
    syntax: string;

    /**
     * Context of abbreviation. For markup abbreviation, it contains parent tag
     * name with attributes, for stylesheet abbreviation it contains property name
     * if abbreviation is expanded as value
     */
    context?: AbbreviationContext;

    /** Text to wrap with abbreviation */
    text?: string | string[];

    /** Max amount of repeated elements (fool proof) */
    maxRepeat?: number;

    /**
     * Object for storing internal cache data to be shared across Emmet methods
     * invocation. If provided, Emmet will store compute-intensive data in this
     * object and will re-use it during editor session.
     * Every time user settings are changed, you should empty cache by passing
     * new object.
     */
    cache?: Cache;
}

export type Config = ResolvedConfig & { options: Options };
export type UserConfig = Partial<ResolvedConfig>;

export interface Cache {
    stylesheetSnippets?: CSSSnippet[];
    markupSnippets?: { [name: string]: Abbreviation | null };
}

export interface Options {
    /////////////////////
    // Generic options //
    /////////////////////

    /** A list of inline-level elements */
    inlineElements: string[];

    ////////////////////
    // Output options //
    ////////////////////

    /** A string for one level indent */
    'output.indent': string;

    /**
     * A string for base indent, e.g. context indentation which will be added
     * for every generated line
     */
    'output.baseIndent': string;

    /** A string to use as a new line */
    'output.newline': string;

    /** Tag case: lower, upper or '' (keep as-is) */
    'output.tagCase': StringCase;

    /** Attribute name case: lower, upper or '' (keep as-is) */
    'output.attributeCase': StringCase;

    /** Attribute value quotes: 'single' or 'double' */
    'output.attributeQuotes': 'single' | 'double';

    /** Enable output formatting (indentation and line breaks) */
    'output.format': boolean;

    /** When enabled, automatically adds inner line breaks for leaf (e.g. without children) nodes */
    'output.formatLeafNode': boolean;

    /** A list of tag names that should not get inner indentation */
    'output.formatSkip': string[];

    /** A list of tag names that should *always* get inner indentation. */
    'output.formatForce': string[];

    /**
     * How many inline sibling elements should force line break for each tag.
     * Set to `0` to output all inline elements without formatting.
     * Set to `1` to output all inline elements with formatting (same as block-level).
     */
    'output.inlineBreak': number;

    /**
     * Produce compact notation of boolean attributes: attributes which doesn’t have value.
     * With this option enabled, outputs `<div contenteditable>` instead of
     * `<div contenteditable="contenteditable">`
     */
    'output.compactBoolean': boolean;

    /** A list of boolean attributes */
    'output.booleanAttributes': string[];

    /** Reverses attribute merging directions when resolving snippets */
    'output.reverseAttributes': boolean;

    /** Style of self-closing tags: html (`<br>`), xml (`<br/>`) or xhtml (`<br />`) */
    'output.selfClosingStyle': 'html' | 'xml' | 'xhtml';

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
    'output.field': FieldOutput;

    /**
     * A function for processing text chunk passed to `OutputStream`.
     * May be used by editor for escaping characters, if necessary
     */
    'output.text': TextOutput;

    ////////////////////
    // Markup options //
    ////////////////////

    /**
     * Automatically update value of <a> element's href attribute
     * if inserting URL or email
     */
    'markup.href': boolean;

    /**
     * Attribute name mapping. Can be used to change attribute names for output.
     * For example, `class` -> `className` in JSX. If a key ends with `*`, this
     * value will be used for multi-attributes: currentry, it’s a `class` and `id`
     * since `multiple` marker is added for shorthand attributes only.
     * Example: `{ "class*": "styleName" }`
     */
    'markup.attributes'?: Record<string, string>;

    /**
     * Prefixes for attribute values.
     * If specified, a value is treated as prefix for object notation and
     * automatically converts attribute value into expression if `jsx` is enabled.
     * Same as in `markup.attributes` option, a `*` can be used.
     */
    'markup.valuePrefix'?: Record<string, string>;

    ////////////////////////////////
    // Element commenting options //
    ////////////////////////////////

    /**
     * Enable/disable element commenting: generate comments before open and/or
     * after close tag
     */
    'comment.enabled': boolean;

    /**
     * Attributes that should trigger node commenting on specific node,
     * if commenting is enabled
     */
    'comment.trigger': string[];

    /**
     * Template string for comment to be placed *before* opening tag
     */
    'comment.before': string;

    /**
     * Template string for comment to be placed *after* closing tag.
     * Example: `\n<!-- /[#ID][.CLASS] -->`
     */
    'comment.after': string;

    /////////////////
    // BEM options //
    /////////////////

    /** Enable/disable BEM addon */
    'bem.enabled': boolean;

    /** A string for separating elements in output class */
    'bem.element': string;

    /** A string for separating modifiers in output class */
    'bem.modifier': string;

    /////////////////
    // JSX options //
    /////////////////

    /** Enable/disable JSX addon */
    'jsx.enabled': boolean;

    ////////////////////////
    // Stylesheet options //
    ////////////////////////

    /** List of globally available keywords for properties */
    'stylesheet.keywords': string[];

    /**
     * List of unitless properties, e.g. properties where numeric values without
     * explicit unit will be outputted as is, without default value
     */
    'stylesheet.unitless': string[];

    /** Use short hex notation where possible, e.g. `#000` instead of `#000000` */
    'stylesheet.shortHex': boolean;

    /** A string between property name and value */
    'stylesheet.between': string;

    /** A string after property value */
    'stylesheet.after': string;

    /** A unit suffix to output by default after integer values, 'px' by default */
    'stylesheet.intUnit': string;

    /** A unit suffix to output by default after float values, 'em' by default */
    'stylesheet.floatUnit': string;

    /**
     * Aliases for custom units in abbreviation. For example, `r: 'rem'` will
     * output `10rem` for abbreviation `10r`
     */
    'stylesheet.unitAliases': SnippetsMap;

    /** Output abbreviation as JSON object properties (for CSS-in-JS syntaxes) */
    'stylesheet.json': boolean;

    /** Use double quotes for JSON values */
    'stylesheet.jsonDoubleQuotes': boolean;

    /**
     * A float number between 0 and 1 to pick fuzzy-matched abbreviations.
     * Lower value will pick more abbreviations (and less accurate)
     */
    'stylesheet.fuzzySearchMinScore': number;
}

/**
 * Default syntaxes for abbreviation types
 */
export const defaultSyntaxes: { [name in SyntaxType]: string } = {
    markup: 'html',
    stylesheet: 'css'
};

/**
 * List of all known syntaxes
 */
export const syntaxes = {
    markup: ['html', 'xml', 'xsl', 'jsx', 'js', 'pug', 'slim', 'haml', 'vue', 'svelte'],
    stylesheet: ['css', 'sass', 'scss', 'less', 'sss', 'stylus']
};

export const defaultOptions: Options = {
    'inlineElements': [
        'a', 'abbr', 'acronym', 'applet', 'b', 'basefont', 'bdo',
        'big', 'br', 'button', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i',
        'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'map', 'object', 'q',
        's', 'samp', 'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
        'textarea', 'tt', 'u', 'var'
    ],
    'output.indent': '\t',
    'output.baseIndent': '',
    'output.newline': '\n',
    'output.tagCase': '',
    'output.attributeCase': '',
    'output.attributeQuotes': 'double',
    'output.format': true,
    'output.formatLeafNode': false,
    'output.formatSkip': ['html'],
    'output.formatForce': ['body'],
    'output.inlineBreak': 3,
    'output.compactBoolean': false,
    'output.booleanAttributes': [
        'contenteditable', 'seamless', 'async', 'autofocus',
        'autoplay', 'checked', 'controls', 'defer', 'disabled', 'formnovalidate',
        'hidden', 'ismap', 'loop', 'multiple', 'muted', 'novalidate', 'readonly',
        'required', 'reversed', 'selected', 'typemustmatch'
    ],
    'output.reverseAttributes': false,
    'output.selfClosingStyle': 'html',
    'output.field': (index, placeholder) => placeholder,
    'output.text': text => text,

    'markup.href': true,

    'comment.enabled': false,
    'comment.trigger': ['id', 'class'],
    'comment.before': '',
    'comment.after': '\n<!-- /[#ID][.CLASS] -->',

    'bem.enabled': false,
    'bem.element': '__',
    'bem.modifier': '_',

    'jsx.enabled': false,

    'stylesheet.keywords': ['auto', 'inherit', 'unset', 'none'],
    'stylesheet.unitless': ['z-index', 'line-height', 'opacity', 'font-weight', 'zoom', 'flex', 'flex-grow', 'flex-shrink'],
    'stylesheet.shortHex': true,
    'stylesheet.between': ': ',
    'stylesheet.after': ';',
    'stylesheet.intUnit': 'px',
    'stylesheet.floatUnit': 'em',
    'stylesheet.unitAliases': { e: 'em', p: '%', x: 'ex', r: 'rem' },
    'stylesheet.json': false,
    'stylesheet.jsonDoubleQuotes': false,
    'stylesheet.fuzzySearchMinScore': 0
};

export const defaultConfig: Config = {
    type: 'markup',
    syntax: 'html',
    variables,
    snippets: {},
    options: defaultOptions
};

/**
 * Default per-syntax config
 */
export const syntaxConfig: GlobalConfig = {
    markup: {
        snippets: parseSnippets(markupSnippets),
    },
    xhtml: {
        options: {
            'output.selfClosingStyle': 'xhtml'
        }
    },
    xml: {
        options: {
            'output.selfClosingStyle': 'xml'
        }
    },
    xsl: {
        snippets: parseSnippets(xslSnippets),
        options: {
            'output.selfClosingStyle': 'xml'
        }
    },
    jsx: {
        options: {
            'jsx.enabled': true,
            'markup.attributes': {
                'class': 'className',
                'class*': 'styleName',
                'for': 'htmlFor'
            },
            'markup.valuePrefix': {
                'class*': 'styles'
            }
        }
    },
    vue: {
        options: {
            'markup.attributes': {
                'class*': ':class',
            }
        }
    },
    svelte: {
        options: {
            'jsx.enabled': true
        }
    },
    pug: {
        snippets: parseSnippets(pugSnippets)
    },

    stylesheet: {
        snippets: parseSnippets(stylesheetSnippets)
    },

    sass: {
        options: {
            'stylesheet.after': ''
        }
    },
    stylus: {
        options: {
            'stylesheet.between': ' ',
            'stylesheet.after': '',
        }
    }
};

/**
 * Parses raw snippets definitions with possibly multiple keys into a plan
 * snippet map
 */
export function parseSnippets(snippets: SnippetsMap): SnippetsMap {
    const result: SnippetsMap = {};
    Object.keys(snippets).forEach(k => {
        for (const name of k.split('|')) {
            result[name] = snippets[k];
        }
    });

    return result;
}

export default function resolveConfig(config: UserConfig = {}, globals: GlobalConfig = {}): Config {
    const type: SyntaxType = config.type || 'markup';
    const syntax: string = config.syntax || defaultSyntaxes[type];

    return {
        ...defaultConfig,
        ...config,
        type,
        syntax,
        variables: mergedData(type, syntax, 'variables', config, globals),
        snippets: mergedData(type, syntax, 'snippets', config, globals),
        options: mergedData(type, syntax, 'options', config, globals)
    };
}

function mergedData<K extends keyof BaseConfig>(type: SyntaxType, syntax: string, key: K, config: UserConfig, globals: GlobalConfig = {}): Config[K] {
    const typeDefaults = syntaxConfig[type];
    const typeOverride = globals[type];
    const syntaxDefaults = syntaxConfig[syntax];
    const syntaxOverride = globals[syntax];

    return {
        ...(defaultConfig[key] as object),
        ...(typeDefaults && typeDefaults[key] as object),
        ...(syntaxDefaults && syntaxDefaults[key] as object),
        ...(typeOverride && typeOverride[key] as object),
        ...(syntaxOverride && syntaxOverride[key] as object),
        ...(config[key] as object)
    } as Config[K];
}
