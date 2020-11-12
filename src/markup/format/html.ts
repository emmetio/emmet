import { Abbreviation, AbbreviationNode, AbbreviationAttribute, Value } from '@emmetio/abbreviation';
import { pushNewline, pushString, tagName, selfClose, attrName, isBooleanAttribute, attrQuote, isInline } from '../../output-stream';
import walk, { WalkState, createWalkState } from './walk';
import { caret, isInlineElement, isSnippet, isField, pushTokens, shouldOutputAttribute } from './utils';
import { commentNodeBefore, commentNodeAfter, CommentWalkState, createCommentState } from './comment';
import { Config } from '../../config';

const htmlTagRegex = /^<([\w\-:]+)[\s>]/;
type WalkNext = (node: AbbreviationNode, index: number, items: AbbreviationNode[]) => void;

export interface HTMLWalkState extends WalkState {
    comment: CommentWalkState;
}

export default function html(abbr: Abbreviation, config: Config): string {
    const state = createWalkState(config) as HTMLWalkState;
    state.comment = createCommentState(config);
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
function element(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: HTMLWalkState, next: WalkNext) {
    const { out, config } = state;
    const format = shouldFormat(node, index, items, state);

    // Pick offset level for current node
    const level = getIndent(state);
    out.level += level;

    format && pushNewline(out, true);

    if (node.name) {
        const name = tagName(node.name, config);
        commentNodeBefore(node, state);
        pushString(out, `<${name}`);

        if (node.attributes) {
            for (const attr of node.attributes) {
                if (shouldOutputAttribute(attr)) {
                    pushAttribute(attr, state);
                }
            }
        }

        if (node.selfClosing && !node.children.length && !node.value) {
            pushString(out, `${selfClose(config)}>`);
        } else {
            pushString(out, '>');

            if (!pushSnippet(node, state, next)) {
                if (node.value) {
                    const innerFormat = node.value.some(hasNewline) || startsWithBlockTag(node.value, config);
                    innerFormat && pushNewline(state.out, ++out.level);
                    pushTokens(node.value, state);
                    innerFormat && pushNewline(state.out, --out.level);
                }

                node.children.forEach(next);

                if (!node.value && !node.children.length) {
                    const innerFormat = config.options['output.formatLeafNode']
                        || config.options['output.formatForce'].includes(node.name);
                    innerFormat && pushNewline(state.out, ++out.level);
                    pushTokens(caret, state);
                    innerFormat && pushNewline(state.out, --out.level);
                }
            }

            pushString(out, `</${name}>`);
            commentNodeAfter(node, state);
        }
    } else if (!pushSnippet(node, state, next) && node.value) {
        // A text-only node (snippet)
        pushTokens(node.value, state);
        node.children.forEach(next);
    }

    if (format && index === items.length - 1 && state.parent) {
        const offset = isSnippet(state.parent) ? 0 : 1;
        pushNewline(out, out.level - offset);
    }

    out.level -= level;
}

/**
 * Outputs given attribute’s content into output stream
 */
function pushAttribute(attr: AbbreviationAttribute, state: WalkState) {
    const { out, config } = state;

    if (attr.name) {
        const name = attrName(attr.name, config);
        const lQuote = attrQuote(attr, config, true);
        const rQuote = attrQuote(attr, config);
        let value = attr.value;

        if (isBooleanAttribute(attr, config) && !value) {
            // If attribute value is omitted and it’s a boolean value, check for
            // `compactBoolean` option: if it’s disabled, set value to attribute name
            // (XML style)
            if (!config.options['output.compactBoolean']) {
                value = [name];
            }
        } else if (!value) {
            value = caret;
        }

        pushString(out, ' ' + name);
        if (value) {
            pushString(out, '=' + lQuote);
            pushTokens(value, state);
            pushString(out, rQuote);
        } else if (config.options['output.selfClosingStyle'] !== 'html') {
            pushString(out, '=' + lQuote + rQuote);
        }
    }
}

export function pushSnippet(node: AbbreviationNode, state: WalkState, next: WalkNext): boolean {
    if (node.value && node.children.length) {
        // We have a value and child nodes. In case if value contains fields,
        // we should output children as a content of first field
        const fieldIx = node.value.findIndex(isField);
        if (fieldIx !== -1) {
            pushTokens(node.value.slice(0, fieldIx), state);
            const line = state.out.line;
            let pos = fieldIx + 1;
            node.children.forEach(next);

            // If there was a line change, trim leading whitespace for better result
            if (state.out.line !== line && typeof node.value[pos] === 'string') {
                pushString(state.out, (node.value[pos++] as string).trimLeft());
            }

            pushTokens(node.value.slice(pos), state);
            return true;
        }
    }

    return false;
}

/**
 * Check if given node should be formatted in its parent context
 */
function shouldFormat(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: WalkState): boolean {
    const { config, parent } = state;

    if (!config.options['output.format']) {
        return false;
    }

    if (index === 0 && !parent) {
        // Do not format very first node
        return false;
    }

    // Do not format single child of snippet
    if (parent && isSnippet(parent) && items.length === 1) {
        return false;
    }

    /**
     * Adjacent text-only/snippet nodes
     */
    if (isSnippet(node)) {
        // Adjacent text-only/snippet nodes
        const format = isSnippet(items[index - 1]) || isSnippet(items[index + 1])

            // Has newlines: looks like wrapping code fragment
            || node.value!.some(hasNewline)

            // Format as wrapper: contains children which will be outputted as field content
            || (node.value!.some(isField) && node.children.length);

        if (format) {
            return true;
        }
    }

    if (isInline(node, config)) {
        // Check if inline node is the next sibling of block-level node
        if (index === 0) {
            // First node in parent: format if it’s followed by a block-level element
            for (let i = 0; i < items.length; i++) {
                if (!isInline(items[i], config)) {
                    return true;
                }
            }
        } else if (!isInline(items[index - 1], config)) {
            // Node is right after block-level element
            return true;
        }

        if (config.options['output.inlineBreak']) {
            // check for adjacent inline elements before and after current element
            let adjacentInline = 1;
            let before = index;
            let after = index;

            while (isInlineElement(items[--before], config)) {
                adjacentInline++;
            }

            while (isInlineElement(items[++after], config)) {
                adjacentInline++;
            }

            if (adjacentInline >= config.options['output.inlineBreak']) {
                return true;
            }
        }

        // Edge case: inline node contains node that should receive formatting
        for (let i = 0, il = node.children.length; i < il; i++) {
            if (shouldFormat(node.children[i], i, node.children, state)) {
                return true;
            }
        }

        return false;
    }

    return true;
}

/**
 * Returns indentation offset for given node
 */
function getIndent(state: WalkState): number {
    const { config, parent } = state;

    if (!parent || isSnippet(parent) || (parent.name && config.options['output.formatSkip'].includes(parent.name))) {
        return 0;
    }

    return 1;
}

/**
 * Check if given node value contains newlines
 */
function hasNewline(value: Value): boolean {
    return typeof value === 'string' && /\r|\n/.test(value);
}

/**
 * Check if given node value starts with block-level tag
 */
function startsWithBlockTag(value: Value[], config: Config): boolean {
    if (value.length && typeof value[0] === 'string') {
        const matches = htmlTagRegex.exec(value[0]);
        if (matches?.length && !config.options['inlineElements'].includes(matches[1].toLowerCase())) {
            return true;
        }
    }
    return false;
}
