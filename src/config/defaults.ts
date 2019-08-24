import markupSnippets from '../../snippets/html.json';
import stylesheetSnippets from '../../snippets/css.json';
import xslSnippets from '../../snippets/xsl.json';
import variables from '../../snippets/variables.json';
import { Options, Config, GlobalConfig, SnippetsMap } from './types';

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

    'comment.enabled': false,
    'comment.trigger': ['id', 'class'],
    'comment.before': '',
    'comment.after': '\n<!-- /[#ID][.CLASS] -->',

    'bem.enabled': false,
    'bem.element': '__',
    'bem.modifier': '_',

    'jsx.enabled': false,

    'stylesheet.keywords': ['auto', 'inherit', 'unset'],
    'stylesheet.unitless': ['z-index', 'line-height', 'opacity', 'font-weight', 'zoom', 'flex', 'flex-grow', 'flex-shrink'],
    'stylesheet.shortHex': true,
    'stylesheet.between': ': ',
    'stylesheet.after': ';',
    'stylesheet.intUnit': 'px',
    'stylesheet.floatUnit': 'em',
    'stylesheet.unitAliases': { e: 'em', p: '%', x: 'ex', r: 'rem' },
    'stylesheet.json': false,
    'stylesheet.jsonDoubleQuotes': false,
    'stylesheet.fuzzySearchMinScore': 0.3
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
            'jsx.enabled': true
        }
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
