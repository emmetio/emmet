import abbreviation, { Abbreviation, AbbreviationNode } from '@emmetio/abbreviation';
import attributes from './attributes';
import snippets from './snippets';
import implicitTag from './implicit-tag';
import { ResolvedConfig } from '../types';
import { walk, Container } from './utils';

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export function parse(abbr: string | Abbreviation, config: ResolvedConfig): Abbreviation {
    if (typeof abbr === 'string') {
        abbr = abbreviation(abbr, config);
    }

    walk(abbr, transform, config);
    return abbr;
}

/**
 * Modifies given node and prepares it for output
 */
function transform(node: AbbreviationNode, ancestors: Container[], config: ResolvedConfig) {
    snippets(node, ancestors, config);
    implicitTag(node, ancestors, config);
    attributes(node);
    // TODO apply addons like XSL, JSX, BEM
}
