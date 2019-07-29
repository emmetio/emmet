import { Abbreviation, AbbreviationNode, AbbreviationAttribute, Value, Field } from '@emmetio/abbreviation';
import { CommentOptions, ResolvedConfig } from '../../types';
import createOutputStream, { pushField, pushIndent, pushNewline, pushString } from '../../output-stream';
import OutputProfile from '../../OutputProfile';
import walk, { WalkState } from './walk';

type WalkNext = (node: AbbreviationNode, index: number, items: AbbreviationNode[]) => void;

interface HTMLWalkState extends WalkState {
    comment: CommentOptions;
    profile: OutputProfile;
}

const commentOptions: CommentOptions = {
    // enable node commenting
    enabled: false,
    trigger: ['id', 'class'],
    before: '',
    after: '\n<!-- /[#ID][.CLASS] -->'
};

const caret = [{ type: 'Field', index: 0, name: '' } as Field];

export default function html(abbr: Abbreviation, config: ResolvedConfig): string {
    const state: HTMLWalkState = {
        // @ts-ignore: Will set value in iterator
        current: null,
        parent: void 0,
        ancestors: [],
        profile: config.profile,
        comment: { ...commentOptions, ...config.options.comment },
        field: 1,
        out: createOutputStream(config.options)
    };

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

    if (format) {
        pushNewline(out);
        pushIndent(out, state.ancestors.length);
    }

    if (node.name) {
        const name = profile.name(node.name);
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
                    outputValue(node.value, state);
                }

                node.children.forEach(next);

                if (!node.value && !node.children.length) {
                    outputValue(caret, state);
                }
            }

            pushString(out, `</${name}>`);
        }
    } else if (!pushSnippet(node, state, next) && node.value) {
        // A text-only node (snippet)
        outputValue(node.value, state);
        node.children.forEach(next);
    }

    if (format && index === items.length - 1 && state.parent) {
        pushNewline(out);
        pushIndent(out, state.ancestors.length - 1);
    }
}

/**
 * Outputs given attribute’s content into output stream
 */
function pushAttribute(attr: AbbreviationAttribute, state: HTMLWalkState) {
    const { out, profile } = state;

    if (attr.name) {
        const name = profile.attribute(attr.name);
        let value = attr.value;
        const lQuote = attr.valueType === 'expression' ? '{' : profile.quoteChar;
        const rQuote = attr.valueType === 'expression' ? '}' : profile.quoteChar;

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
            outputValue(value, state);
            pushString(out, rQuote);
        } else if (profile.get('selfClosingStyle') !== 'html') {
            pushString(out, '=' + lQuote + rQuote);
        }
    }
}

function pushSnippet(node: AbbreviationNode, state: HTMLWalkState, next: WalkNext): boolean {
    if (node.value && node.children.length) {
        // We have a value and child nodes. In case if value contains fields,
        // we should output children as a content of first field
        const fieldIx = node.value.findIndex(isField);
        if (fieldIx !== -1) {
            outputValue(node.value.slice(0, fieldIx), state);
            node.children.forEach(next);
            outputValue(node.value.slice(fieldIx + 1), state);
            return true;
        }
    }

    return false;
}

function outputValue(tokens: Value[], state: HTMLWalkState) {
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
 * Check if given node should be formatted in its parent context
 */
function shouldFormat(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: HTMLWalkState): boolean {
    const { profile } = state;

    if (!profile.get('format')) {
        return false;
    }

    if (index === 0 && !state.parent) {
        // Do not format very first node
        return false;
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
 * Check if contents of given node should be formatted
 */
// function shouldFormatContent(node: AbbreviationNode, state: HTMLWalkState): boolean {
//     for (let i = 0; i < node.children.length; i++) {
//         if (shouldFormat(node.children[i], i, node.children, state)) {
//             return true;
//         }
//     }

//     return false;
// }

// function isTextOnly(node: AbbreviationNode): boolean {
//     return !node.name && !node.attributes && !node.children.length;
// }

/**
 * Check if given node is inline-level element, e.g. element with explicitly
 * defined node name
 */
function isInlineElement(node: AbbreviationNode | undefined, profile: OutputProfile): boolean {
    return node ? profile.isInline(node) : false;
}

function isField(token: Value): token is Field {
    return typeof token === 'object' && token.type === 'Field';
}
