import { Abbreviation, AbbreviationNode, AbbreviationAttribute } from '@emmetio/abbreviation';
import { CommentOptions, ResolvedConfig } from '../../types';
import { pushNewline, pushString } from '../../output-stream';
import walk, { WalkState, createWalkState } from './walk';
import { caret, isInlineElement, isSnippet, isField, pushTokens } from './utils';
import { CommentWalkState, createCommentState, commentNodeBefore, commentNodeAfter } from './comment';

type WalkNext = (node: AbbreviationNode, index: number, items: AbbreviationNode[]) => void;

export interface HTMLWalkState extends WalkState {
    comment: CommentWalkState;
}

const commentOptions: CommentOptions = {
    enabled: false,
    trigger: ['id', 'class'],
    before: '',
    after: '\n<!-- /[#ID][.CLASS] -->'
};

export default function html(abbr: Abbreviation, config: ResolvedConfig): string {
    const state = createWalkState(config) as HTMLWalkState;
    state.comment = createCommentState({ ...commentOptions, ...config.options.comment });

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
    const { out, profile } = state;
    const format = shouldFormat(node, index, items, state);

    // Pick offset level for current node
    const level = getIndent(state);
    out.level += level;

    format && pushNewline(out, true);

    if (node.name) {
        const name = profile.name(node.name);
        commentNodeBefore(node, state);
        pushString(out, `<${name}`);

        if (node.attributes) {
            for (const attr of node.attributes) {
                pushAttribute(attr, state);
            }
        }

        if (node.selfClosing && !node.children.length && !node.value) {
            pushString(out, `${profile.selfClose()}>`);
        } else {
            pushString(out, '>');

            if (!pushSnippet(node, state, next)) {
                if (node.value) {
                    pushTokens(node.value, state);
                }

                node.children.forEach(next);

                if (!node.value && !node.children.length) {
                    const innerFormat = profile.options.formatForce.includes(node.name);
                    innerFormat && pushNewline(state.out, out.level + 1);
                    pushTokens(caret, state);
                    innerFormat && pushNewline(state.out, true);
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
function pushAttribute(attr: AbbreviationAttribute, state: HTMLWalkState) {
    const { out, profile } = state;

    if (attr.name) {
        const name = profile.attribute(attr.name);
        const lQuote = attr.valueType === 'expression' ? '{' : profile.quoteChar;
        const rQuote = attr.valueType === 'expression' ? '}' : profile.quoteChar;
        let value = attr.value;

        if (profile.isBooleanAttribute(attr) && !value) {
            // If attribute value is omitted and it’s a boolean value, check for
            // `compactBoolean` option: if it’s disabled, set value to attribute name
            // (XML style)
            if (!profile.get('compactBoolean')) {
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
        } else if (profile.get('selfClosingStyle') !== 'html') {
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
function shouldFormat(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: HTMLWalkState): boolean {
    const { profile, parent } = state;

    if (!profile.get('format')) {
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

    // If given node is a snippet, format it if it will be handled as wrapper
    // (contains children which will be outputted as field content)
    if (isSnippet(node) && node.value!.some(isField) && node.children.length) {
        return true;
    }

    if (profile.isInline(node)) {
        // Check if inline node is the next sibling of block-level node
        if (index === 0) {
            // First node in parent: format if it’s followed by a block-level element
            for (let i = 0; i < items.length; i++) {
                if (!profile.isInline(items[i])) {
                    return true;
                }
            }
        } else if (!profile.isInline(items[index - 1])) {
            // Node is right after block-level element
            return true;
        }

        if (profile.get('inlineBreak')) {
            // check for adjacent inline elements before and after current element
            let adjacentInline = 1;
            let before = index;
            let after = index;

            while (isInlineElement(items[--before], profile)) {
                adjacentInline++;
            }

            while (isInlineElement(items[++after], profile)) {
                adjacentInline++;
            }

            if (adjacentInline >= profile.get('inlineBreak')) {
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
function getIndent(state: HTMLWalkState): number {
    const { profile, parent } = state;

    if (!parent || isSnippet(parent) || (parent.name && profile.options.formatSkip.includes(parent.name))) {
        return 0;
    }

    return 1;
}
