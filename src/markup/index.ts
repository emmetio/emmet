import abbreviation, { EMAbbreviation, EMElement } from '@emmetio/abbreviation';
import { walk, Container } from './walk';
import { ResolvedConfig } from '../types';
import unroll from './unroll';
import attributes from './attributes';
import snippets from './snippets';
import variables from './variables';
import implicitTag from './implicit-tag';
import numbering from './numbering';

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export function parse(abbr: string | EMAbbreviation, config: ResolvedConfig): EMAbbreviation {
    if (typeof abbr === 'string') {
        abbr = abbreviation(abbr);
    }

    return transform(abbr, config);
}

/**
 * Rewrites given abbreviation, prepares it for output
 */
export function transform(abbr: EMAbbreviation, config: ResolvedConfig): EMAbbreviation {
    walk(abbr, unroll, config);
    walk(abbr, transformNode, config);
    return abbr;
}

function transformNode(node: EMElement, ancestors: Container[], config: ResolvedConfig) {
    snippets(node, ancestors, config);
    variables(node, ancestors, config);

    // TODO insert content from `config.text`
    implicitTag(node, ancestors, config);
    attributes(node);
    numbering(node, ancestors, config);
    // TODO apply addons like XSL, JSX, BEM
}
