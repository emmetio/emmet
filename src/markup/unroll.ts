import Scanner from '@emmetio/scanner';
import { EMStatement, EMAbbreviation, EMLiteral } from '@emmetio/abbreviation';
import { Container, walk } from './walk';
import { clone, isGroup, replaceToken, isElement, addToDeepest } from './utils';

export interface UnrollState {
    inserted?: boolean;
    text?: string | string[];
}

export default function unroll(abbr: EMAbbreviation, state: UnrollState = {}): EMAbbreviation {
    walk(abbr, unrollNode, state);
    unrollNode(abbr, [], state);
    return abbr;
}

export function unrollNode(node: Container, ancestors: Container[], state: UnrollState) {
    let items: EMStatement[] = [];

    for (let child of node.items) {
        if (child.repeat) {
            if (child.repeat.count == null) {
                items = items.concat(handleImplicitRepeater(child, state));
            } else {
                // Repeat elements and remove groups
                for (let j = 0; j < child.repeat!.count!; j++) {
                    if (isGroup(child)) {
                        for (let child2 of child.items) {
                            child2 = clone(child2);
                            child2.repeat = child2.repeat || { ...child.repeat, value: j };
                            items.push(child2);
                        }
                    } else {
                        child = clone(child);
                        child.repeat = { ...child.repeat, value: j };
                        items.push(child);
                    }
                }
            }
        } else if (isGroup(child)) {
            items = items.concat(child.items);
        } else {
            items.push(child);
        }
    }

    node.items = items;
}

/**
 * Handles node with implicit repeater, a repeater without explicit counter like `ul*`.
 * In this case, we should repeat content by the amount text strings in `config.text`
 * and insert corresponding text value into duplicated node
 */
function handleImplicitRepeater(node: EMStatement, state: UnrollState): EMStatement[] {
    const result: EMStatement[] = [];
    const count = Array.isArray(state.text) ? state.text.length : 1;

    for (let i = 0; i < count; i++) {
        const copy = clone(node);
        let text = Array.isArray(state.text) ? state.text[i] : state.text;
        if (text == null) {
            text = '';
        }

        if (!replaceRepeater(copy, text)) {
            addToDeepest(copy, text);
        }

        state.inserted = true;

        if (isGroup(copy)) {
            for (const child of copy.items) {
                child.repeat = child.repeat || { ...node.repeat, count, value: i };
                result.push(child);
            }
        } else {
            copy.repeat = { ...node.repeat, count, value: i };
            result.push(copy);
        }
    }

    return result;
}

/**
 * Replaces `$#` repeater token in given element with `text`.
 * @returns `1` if repeater was found and replaced, `0` otherwise
 */
function replaceRepeater(node: Container, text: string): number {
    let replaced = 0;

    if (isElement(node)) {
        replaced = replaceRepeaterInItem(node, text);
        for (const attr of node.attributes) {
            replaced |= replaceRepeaterInItem(attr, text);
        }
    }

    for (const child of node.items) {
        replaced |= replaceRepeater(child, text);
    }

    return replaced;
}

function replaceRepeaterInItem(item: { name?: string, value?: EMLiteral }, value: string): number {
    let result: string | undefined;
    let replaced = 0;

    if (item.name) {
        result = replaceToken(item.name, consumeRepeater, value);
        if (item.name !== result) {
            replaced = 1;
            item.name = result;
        }
    }

    if (item.value) {
        result = replaceToken(item.value.value, consumeRepeater, value);
        if (item.value.value !== result) {
            replaced = 1;
            item.value.value = result;
        }
    }

    return replaced;
}

function consumeRepeater(scanner: Scanner): boolean {
    const start = scanner.pos;
    if (scanner.eat(36) /* # */ && scanner.eat(35) /* # */) {
        scanner.start = start;
        return true;
    }

    scanner.pos = start;
    return false;
}
