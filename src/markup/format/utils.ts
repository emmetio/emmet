import { AbbreviationNode, Field, Value } from '@emmetio/abbreviation';
import OutputProfile from '../../OutputProfile';

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
