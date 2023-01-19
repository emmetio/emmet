import abbreviation from '@emmetio/abbreviation';
import type { Abbreviation, AbbreviationNode, ParserOptions } from '@emmetio/abbreviation';
import attributes from './attributes.js';
import snippets from './snippets.js';
import implicitTag from './implicit-tag.js';
import lorem from './lorem/index.js';
import xsl from './addon/xsl.js';
import bem from './addon/bem.js';
import html from './format/html.js';
import haml from './format/haml.js';
import slim from './format/slim.js';
import pug from './format/pug.js';
import type { Config } from '../config.js';
import { walk, type Container } from './utils.js';

type Formatter = (abbr: Abbreviation, config: Config) => string;

const formatters: { [syntax: string]: Formatter } = { html, haml, slim, pug };

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export default function parse(abbr: string | Abbreviation, config: Config): Abbreviation {
    let oldTextValue: string | string[] | undefined;
    if (typeof abbr === 'string') {
        const parseOpt: ParserOptions = { ...config };

        if (config.options['jsx.enabled']) {
            parseOpt.jsx = true;
        }

        if (config.options['markup.href']) {
            parseOpt.href = true;
        }

        abbr = abbreviation(abbr, parseOpt);

        // remove text field before snippets(abbr, config) call
        // as abbreviation(abbr, parseOpt) already handled it
        oldTextValue = config.text;
        config.text = undefined;
    }

    // Run abbreviation resolve in two passes:
    // 1. Map each node to snippets, which are abbreviations as well. A single snippet
    // may produce multiple nodes
    // 2. Transform every resolved node
    abbr = snippets(abbr, config);
    walk(abbr, transform, config);
    config.text = oldTextValue ?? config.text;
    return abbr;
}

/**
 * Converts given abbreviation to string according to provided `config`
 */
export function stringify(abbr: Abbreviation, config: Config): string {
    const formatter: Formatter = formatters[config.syntax] || html;
    return formatter(abbr, config);
}

/**
 * Modifies given node and prepares it for output
 */
function transform(node: AbbreviationNode, ancestors: Container[], config: Config) {
    implicitTag(node, ancestors, config);
    attributes(node, config);
    lorem(node, ancestors, config);

    if (config.syntax === 'xsl') {
        xsl(node);
    }

    if (config.options['bem.enabled']) {
        bem(node, ancestors, config);
    }
}
