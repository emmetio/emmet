import { EMStatement, EMAbbreviation, EMTokenGroup, EMElement, EMGroup, EMRepeaterPlaceholder } from '@emmetio/abbreviation';
import { isGroup, isElement, isRepeaterPlaceholder, findDeepest } from './utils';
import clone from './clone';

type RepeatContinue = (ctx: EMStatement) => EMElement[];

export interface UnrollState {
    inserted?: boolean;
    text?: string | string[];
}

export default function unroll(abbr: EMAbbreviation, state: UnrollState = {}): EMAbbreviation {
    const next: RepeatContinue = ctx =>
        unrollNode(unrolledCopy(ctx, next), state);

    return unrolledCopy(abbr, next);
}

/**
 * Inserts given value as a repeater placeholder value of deepest child of `node`
 */
export function addToDeepest(node: EMAbbreviation | EMStatement, value: string) {
    const deepest = findDeepest(node).node;
    if (isElement(deepest)) {
        if (!deepest.value) {
            deepest.value = {
                type: 'EMTokenGroup',
                tokens: [createPlaceholder(value)],
                raw: value
            };
        } else if (!setPlaceholderValue(deepest.value, value)) {
            deepest.value.tokens.push(createPlaceholder(value));
        }
    }
}

/**
 * Creates shallow copy of given container with unrolled content
 */
function unrolledCopy<T extends EMAbbreviation | EMStatement>(node: T, next: RepeatContinue): T {
    let items: EMElement[] = [];

    for (const child of node.items) {
        items = items.concat(next(child));
    }

    // TODO replace repeater value token

    return { ...node, items };
}

function unrollNode(node: EMStatement, state: UnrollState): EMElement[] {
    if (node.repeat) {
        const count = node.repeat.implicit && Array.isArray(state.text)
            ? state.text.length
            : (node.repeat.count || 1);

        return isGroup(node)
            ? repeatGroup(node, count, state)
            : repeatElement(node, count, state);
    }

    // No need to repeat, get rid of groups
    return isGroup(node) ? (node.items as EMElement[]) : [node];
}

/**
 * Returns repeated content of given group node
 * @param node Node to repeat
 * @param count How many times node should be repeated
 */
function repeatGroup(node: EMGroup, count: number, state: UnrollState): EMElement[] {
    const result: EMElement[] = [];

    for (let value = 0; value < count; value++) {
        const copy = cloneWithText(node, value, state);

        // NB children are already cloned in `copy`
        for (const child of copy.items) {
            if (!child.repeat && node.repeat) {
                child.repeat = { ...node.repeat, count, value };
            }
            result.push(child as EMElement);
        }
    }

    return result;
}

/**
 * Returns repeated element
 * @param node Node to repeat
 * @param count How many times node should be repeated
 */
function repeatElement(node: EMElement, count: number, state: UnrollState): EMElement[] {
    const result: EMElement[] = [];

    for (let value = 0; value < count; value++) {
        const copy = cloneWithText(node, value, state);
        if (copy.repeat) {
            copy.repeat.count = count;
            copy.repeat.value = value;
        }

        result.push(copy);
    }

    return result;
}

/**
 * Replaces `$#` repeater token in given element with `text`.
 * @returns `1` if repeater was found and replaced, `0` otherwise
 */
function setPlaceholderInNode(node: EMStatement, text: string): number {
    let updated = 0;

    if (isElement(node)) {
        updated |= setPlaceholderValue(node.name, text) | setPlaceholderValue(node.value, text);
        for (const attr of node.attributes) {
            updated |= setPlaceholderValue(attr.name, text) | setPlaceholderValue(attr.value, text);
        }
    }

    for (const child of node.items) {
        updated |= setPlaceholderInNode(child, text);
    }

    return updated;
}

function setPlaceholderValue(group: EMTokenGroup | undefined, value: string): number {
    let result = 0;

    if (group) {
        for (const token of group.tokens) {
            if (isRepeaterPlaceholder(token)) {
                token.value = value;
                result = 1;
            }
        }
    }

    return result;
}

/**
 * Creates a deep clone of given node and inserts matching text from state into it
 */
function cloneWithText<T extends EMStatement>(node: T, counter: number, state: UnrollState): T {
    node = clone(node);
    const text = Array.isArray(state.text) ? state.text[counter] : void 0;

    if (text) {
        setPlaceholderInNode(node, text) || addToDeepest(node, text);
        state.inserted = true;
    }

    return node;
}

function createPlaceholder(value?: string): EMRepeaterPlaceholder {
    return { type: 'EMRepeaterPlaceholder', value };
}
