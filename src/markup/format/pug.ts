import { Abbreviation, AbbreviationNode } from '@emmetio/abbreviation';
import { ResolvedConfig } from '../../types';
import walk, { WalkState, WalkNext, createWalkState } from './walk';
import { pushNewline, pushString } from '../../output-stream';
import { isSnippet } from './utils';
import { pushPrimaryAttributes, pushSecondaryAttributes, pushValue, collectAttributes } from './indent-format';

export default function pug(abbr: Abbreviation, config: ResolvedConfig): string {
    const state = createWalkState(config);
    walk(abbr, element, state);
    return state.out.value;
}

/**
 * Outputs `node` content to output stream of `state`
 * @param node Context node
 * @param index Index of `node` in `items`
 * @param items List of `node`’s siblings
 * @param state Current walk state
 */
function element(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: WalkState, next: WalkNext) {
    const { out } = state;
    const { primary, secondary } = collectAttributes(node);

    // Pick offset level for current node
    const level = state.parent ? 1 : 0;
    out.level += level;

    // Do not indent top-level elements
    if (shouldFormat(node, index, items, state)) {
        pushNewline(out, true);
    }

    if (node.name && (node.name !== 'div' || !primary.length)) {
        pushString(out, node.name);
    }

    pushPrimaryAttributes(primary, state);
    pushSecondaryAttributes(secondary, state, {
        before: '(',
        after: ')',
        glue: ', ',
        booleanValue: ''
    });

    pushValue(node, state, '| ');
    node.children.forEach(next);

    out.level -= level;
}

function shouldFormat(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: WalkState): boolean {
    // Do not format first top-level element or snippets
    if (!state.parent && index === 0) {
        return false;
    }
    return !isSnippet(node);
}
