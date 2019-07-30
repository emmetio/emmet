import { AbbreviationNode, Field, Value } from '@emmetio/abbreviation';
import OutputProfile from '../../OutputProfile';
import { WalkState } from './walk';
import { pushString, pushField } from '../../output-stream';

export interface TemplateData { [token: string]: string; }

/**
 * Check if given node is a snippet: a node without name and attributes
 */
export function isSnippet(node: AbbreviationNode): boolean {
    return !node.name && !node.attributes;
}

/**
 * Check if given node is inline-level element, e.g. element with explicitly
 * defined node name
 */
export function isInlineElement(node: AbbreviationNode | undefined, profile: OutputProfile): boolean {
    return node ? profile.isInline(node) : false;
}

/**
 * Check if given value token is a field
 */
export function isField(token: Value): token is Field {
    return typeof token === 'object' && token.type === 'Field';
}

export function pushTokens(tokens: Value[], state: WalkState) {
    const { out } = state;
    let largestIndex = -1;

    for (const t of tokens) {
        if (typeof t === 'string') {
            pushString(out, t);
        } else {
            pushField(out, state.field + t.index!, t.name);
            if (t.index! > largestIndex) {
                largestIndex = t.index!;
            }
        }
    }

    if (largestIndex !== -1) {
        state.field += largestIndex + 1;
    }
}
