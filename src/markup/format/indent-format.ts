import { AbbreviationNode, AbbreviationAttribute, Value, Abbreviation } from '@emmetio/abbreviation';
import { pushString, pushNewline, push, attrName, isBooleanAttribute, attrQuote } from '../../output-stream';
import { pushTokens, caret, splitByLines, isSnippet, shouldOutputAttribute } from './utils';
import walk, { WalkState, createWalkState, WalkNext } from './walk';
import { Config } from '../../config';

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

export interface IndentWalkState extends WalkState {
    options: FormatOptions;
}

export interface FormatOptions {
    /** String to output before tag name */
    beforeName?: string;

    /** String to output after tag name */
    afterName?: string;

    /** String to output before secondary attribute set */
    beforeAttribute?: string;

    /** String to output after secondary attribute set */
    afterAttribute?: string;

    /** String to put between secondary attributes */
    glueAttribute?: string;

    /** Value for boolean attributes */
    booleanValue?: string;

    /** String to put before content line (if value is multiline) */
    beforeTextLine?: string;

    /** String to put after content line (if value is multiline) */
    afterTextLine?: string;

    /** String to put after self-closing elements like `br`. Mostly a `/` character */
    selfClose?: string;
}

export default function indentFormat(abbr: Abbreviation, config: Config, options?: Partial<FormatOptions>): string {
    const state = createWalkState(config) as IndentWalkState;
    state.options = options || {};
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
export function element(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: IndentWalkState, next: WalkNext) {
    const { out, options } = state;
    const { primary, secondary } = collectAttributes(node);

    // Pick offset level for current node
    const level = state.parent ? 1 : 0;
    out.level += level;

    // Do not indent top-level elements
    if (shouldFormat(node, index, items, state)) {
        pushNewline(out, true);
    }

    if (node.name && (node.name !== 'div' || !primary.length)) {
        pushString(out, (options.beforeName || '') + node.name + (options.afterName || ''));
    }

    pushPrimaryAttributes(primary, state);
    pushSecondaryAttributes(secondary.filter(shouldOutputAttribute), state);

    if (node.selfClosing && !node.value && !node.children.length) {
        if (state.options.selfClose) {
            pushString(out, state.options.selfClose);
        }
    } else {
        pushValue(node, state);
        node.children.forEach(next);
    }

    out.level -= level;
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
        if (attr.value) {
            if (attr.name === 'class') {
                pushString(state.out, '.');
                // All whitespace characters must be replaced with dots in class names
                const tokens = attr.value.map(t => typeof t === 'string' ? t.replace(/\s+/g, '.') : t);
                pushTokens(tokens, state);
            } else {
                // ID attribute
                pushString(state.out, '#');
                pushTokens(attr.value, state);
            }
        }
    }
}

/**
 * Outputs given attributes as secondary into output stream
 */
export function pushSecondaryAttributes(attrs: AbbreviationAttribute[], state: IndentWalkState) {
    if (attrs.length) {
        const { out, config, options } = state;

        options.beforeAttribute && pushString(out, options.beforeAttribute);

        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            pushString(out, attrName(attr.name || '', config));
            if (isBooleanAttribute(attr, config) && !attr.value) {
                if (!config.options['output.compactBoolean'] && options.booleanValue) {
                    pushString(out, '=' + options.booleanValue);
                }
            } else {
                pushString(out, '=' + attrQuote(attr, config, true));
                pushTokens(attr.value || caret, state);
                pushString(out, attrQuote(attr, config));
            }

            if (i !== attrs.length - 1 && options.glueAttribute) {
                pushString(out, options.glueAttribute);
            }
        }

        options.afterAttribute && pushString(out, options.afterAttribute);
    }
}

/**
 * Outputs given node value into state output stream
 */
export function pushValue(node: AbbreviationNode, state: IndentWalkState) {
    // We should either output value or add caret but for leaf nodes only (no children)
    if (!node.value && node.children.length) {
        return;
    }

    const value = node.value || caret;
    const lines = splitByLines(value);
    const { out, options } = state;

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
            options.beforeTextLine && push(out, options.beforeTextLine);
            pushTokens(lines[i], state);
            if (options.afterTextLine) {
                push(out, ' '.repeat(maxLength - lineLengths[i]));
                push(out, options.afterTextLine);
            }
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

function shouldFormat(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: WalkState): boolean {
    // Do not format first top-level element or snippets
    if (!state.parent && index === 0) {
        return false;
    }
    return !isSnippet(node);
}
