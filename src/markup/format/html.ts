import { Abbreviation, AbbreviationNode, AbbreviationAttribute, Value } from '@emmetio/abbreviation';
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

export default function html(abbr: Abbreviation, config: ResolvedConfig): string {
    const state: HTMLWalkState = {
        // @ts-ignore: Will set value in iterator
        current: null,
        parent: void 0,
        ancestors: [],
        profile: config.profile,
        comment: { ...commentOptions, ...config.options.comment },
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
    if (node.name) {
        const name = profile.name(node.name);
        pushIndent(out, state.ancestors.length);
        pushString(out, `<${name}`);

        if (node.attributes) {
            for (const attr of node.attributes) {
                attribute(attr, state);
            }
        }

        if (node.selfClosing && !node.children.length && !node.value) {
            pushString(out, `${profile.selfClose()}>`);
        } else {
            pushString(out, '>');

            if (node.value) {
                outputValue(node.value, state);
            }

            pushString(out, `</${name}>`);
        }
    }
}

/**
 * Outputs given attribute’s content into output stream
 */
function attribute(attr: AbbreviationAttribute, state: HTMLWalkState) {
    const { out, profile } = state;

    if (attr.name) {
        const name = profile.attribute(attr.name);
        let value = attr.value;
        const lQuote = attr.valueType === 'expression' ? '{' : profile.quoteChar;
        const rQuote = attr.valueType === 'expression' ? '}' : profile.quoteChar;

        if (profile.isBooleanAttribute(attr) && !value && !profile.get('compactBoolean')) {
            value = [name];
        }

        pushString(out, name);
        if (value) {
            pushString(out, '=' + lQuote);
            outputValue(value, state);
            pushString(out, '=' + rQuote);
        } else if (profile.get('selfClosingStyle') !== 'html') {
            pushString(out, '=' + lQuote + rQuote);
        }
    }
}

function outputValue(tokens: Value[], state: HTMLWalkState) {
    const { out } = state;
    for (const t of tokens) {
        if (typeof t === 'string') {
            pushString(out, t);
        } else {
            pushField(out, t.index!, t.name);
        }
    }
}

/**
 * Check if given node should be formatted in its parent context
 */
function shouldFormat(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: HTMLWalkState): boolean {
    const { profile } = state;

    if (!profile.get('format') || isTextOnly(node)) {
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

function isTextOnly(node: AbbreviationNode): boolean {
    return !node.name && !node.attributes && !node.children.length;
}

/**
 * Check if given node is inline-level element, e.g. element with explicitly
 * defined node name
 */
function isInlineElement(node: AbbreviationNode | undefined, profile: OutputProfile): boolean {
    return node ? profile.isInline(node) : false;
}
