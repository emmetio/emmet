import abbreviation, { EMAbbreviation, EMElement } from '@emmetio/abbreviation';
import { walk, Container } from './walk';
import { ResolvedConfig } from '../types';
import unroll, { UnrollState } from './unroll';
import attributes from './attributes';
import snippets from './snippets';
import variables from './variables';
import implicitTag from './implicit-tag';
import numbering from './numbering';
import { findDeepest, isElement } from './utils';

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export function parse(abbr: string | EMAbbreviation, config: ResolvedConfig): EMAbbreviation {
    if (typeof abbr === 'string') {
        abbr = abbreviation(abbr);
    }

    const state: UnrollState = {
        inserted: false,
        text: config.text
    };

    unroll(abbr, state);
    walk(abbr, transform, config);

    if (!state.inserted && state.text) {
        // Should insert text
        const value = Array.isArray(state.text) ? state.text.join('\n') : state.text;
        const deepest = findDeepest(abbr);
        if (isElement(deepest.node)) {
            if (deepest.node.value) {
                deepest.node.value.type += value;
            } else {
                deepest.node.value = { type: 'EMLiteral', value };
            }
        }
    }

    return abbr;
}

/**
 * Modifies given node and prepares it for output
 */
function transform(node: EMElement, ancestors: Container[], config: ResolvedConfig) {
    snippets(node, ancestors, config);
    variables(node, ancestors, config);
    implicitTag(node, ancestors, config);
    attributes(node);
    numbering(node, ancestors, config);
    // TODO apply addons like XSL, JSX, BEM
}
