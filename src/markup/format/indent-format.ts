import { AbbreviationNode, AbbreviationAttribute, Value } from '@emmetio/abbreviation';
import { pushString, pushNewline, push } from '../../output-stream';
import { pushTokens, caret, splitByLines } from './utils';
import { WalkState } from './walk';

/**
 * @description Utility methods for working with indent-based markup languages
 * like HAML, Slim, Pug etc.
 */

interface AttributesCollection {
    /** Primary element attributes: `id` and `class` */
    primary: AbbreviationAttribute[];

    /** Secondary element attributes: everything except `id` and `class` */
    secondary: AbbreviationAttribute[];
}

/**
 * From given node, collects all attributes as `primary` (id, class) and
 * `secondary` (all the rest) lists. In most indent-based syntaxes, primary attribute
 * has special syntax
 */
export function collectAttributes(node: AbbreviationNode): AttributesCollection {
    const primary: AbbreviationAttribute[] = [];
    const secondary: AbbreviationAttribute[] = [];

    if (node.attributes) {
        for (const attr of node.attributes) {
            if (isPrimaryAttribute(attr)) {
                primary.push(attr);
            } else {
                secondary.push(attr);
            }
        }
    }

    return { primary, secondary };
}

/**
 * Outputs given attributes as primary into output stream
 */
export function pushPrimaryAttributes(attrs: AbbreviationAttribute[], state: WalkState) {
    for (const attr of attrs) {
        const isClass = attr.name === 'class';
        pushString(state.out, isClass ? '.' : '#');
        if (attr.value) {
            const tokens = isClass
                // All whitespace characters must be replaced with dots in class names
                ? attr.value.map(t => typeof t === 'string' ? t.replace(/\s+/g, '.') : t)
                : attr.value;
            pushTokens(tokens, state);
        }
    }
}

/**
 * Outputs given attributes as secondary into output stream
 */
export function pushSecondaryAttributes(attrs: AbbreviationAttribute[], state: WalkState, before = '', after = '') {
    if (attrs.length) {
        const { out, profile } = state;

        pushString(out, before);

        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            pushString(out, profile.attribute(attr.name || ''));
            if (profile.isBooleanAttribute(attr) && !attr.value) {
                if (!profile.get('compactBoolean')) {
                    pushString(out, '=true');
                }
            } else {
                pushString(out, '=' + profile.quoteChar);
                pushTokens(attr.value || caret, state);
                pushString(out, profile.quoteChar);
            }

            if (i !== attrs.length - 1) {
                pushString(out, ' ');
            }
        }

        pushString(out, after);
    }
}

/**
 * Outputs given node value into state output stream
 */
export function pushValue(node: AbbreviationNode, state: WalkState, before = '', after = '') {
    // We should either output value or add caret but for leaf nodes only (no children)
    if (!node.value && node.children.length) {
        return;
    }

    const value = node.value || caret;
    const lines = splitByLines(value);
    const { out } = state;

    if (lines.length === 1) {
        if (node.name || node.attributes) {
            push(out, ' ');
        }
        pushTokens(value, state);
    } else {
        // We should format multi-line value with terminating `|` character
        // and same line length
        const lineLengths: number[] = [];
        let maxLength = 0;

        // Calculate lengths of all lines and max line length
        for (const line of lines) {
            const len = valueLength(line);
            lineLengths.push(len);
            if (len > maxLength) {
                maxLength = len;
            }
        }

        // Output each line, padded to max length
        out.level++;
        for (let i = 0; i < lines.length; i++) {
            pushNewline(out, true);
            before && push(out, before);
            pushTokens(lines[i], state);
            push(out, ' '.repeat(maxLength - lineLengths[i]));
            after && push(out, after);
        }
        out.level--;
    }
}

function isPrimaryAttribute(attr: AbbreviationAttribute): boolean {
    return attr.name === 'class' || attr.name === 'id';
}

/**
 * Calculates string length from given tokens
 */
function valueLength(tokens: Value[]): number {
    let len = 0;

    for (const token of tokens) {
        len += typeof token === 'string' ? token.length : token.name.length;
    }

    return len;
}
