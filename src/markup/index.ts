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

    unroll(abbr, config);
    walk(abbr, transform, config);
    return abbr;
}

/**
 * Modifies given node and prepares it for output
 */
function transform(node: EMElement, ancestors: Container[], config: ResolvedConfig) {
    snippets(node, ancestors, config);
    variables(node, ancestors, config);

    // TODO insert content from `config.text`
    implicitTag(node, ancestors, config);
    attributes(node);
    numbering(node, ancestors, config);
    // TODO apply addons like XSL, JSX, BEM
}
