import { AbbreviationNode, Field, Value, AbbreviationAttribute } from '@emmetio/abbreviation';
import { WalkState } from './walk';
import { pushString, pushField, isInline } from '../../output-stream';
import { Config } from '../../config';

export const caret = [{ type: 'Field', index: 0, name: '' } as Field];

/**
 * Check if given node is a snippet: a node without name and attributes
 */
export function isSnippet(node?: AbbreviationNode): boolean {
    return node ? !node.name && !node.attributes : false;
}

/**
 * Check if given node is inline-level element, e.g. element with explicitly
 * defined node name
 */
export function isInlineElement(node: AbbreviationNode | undefined, config: Config): boolean {
    return node ? isInline(node, config) : false;
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

/**
 * Splits given value token by lines: returns array where each entry is a token list
 * for a single line
 */
export function splitByLines(tokens: Value[]): Value[][] {
    const result: Value[][] = [];
    let line: Value[] = [];

    for (const t of tokens) {
        if (typeof t === 'string') {
            const lines = t.split(/\r\n?|\n/g);
            line.push(lines.shift() || '');
            while (lines.length) {
                result.push(line);
                line = [lines.shift() || ''];
            }
        } else {
            line.push(t);
        }
    }

    line.length && result.push(line);
    return result;
}

/**
 * Check if given attribute should be outputted
 */
export function shouldOutputAttribute(attr: AbbreviationAttribute): boolean {
    // In case if attribute is implied, check if it has a defined value:
    // either non-empty value or quoted empty value
    return !attr.implied || attr.valueType !== 'raw' || (!!attr.value && attr.value.length > 0);
}
