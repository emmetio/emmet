import Scanner from '@emmetio/scanner';
import { EMAttribute, EMLiteral, EMNode, EMElement, EMGroup } from '@emmetio/abbreviation';
import { Container } from './walk';

/**
 * Creates deep copy of given abbreviation node
 */
export function clone<T extends Container>(node: T): T {
    const copy: T = {
        ...node,
        items: node.items.map(clone)
    };

    if (isElement(copy)) {
        copy.attributes = copy.attributes.map(cloneAttribute);
        copy.value = cloneValue(copy.value);
    }

    if ((isElement(copy) || isGroup(copy)) && copy.repeat) {
        copy.repeat = { ...copy.repeat };
    }

    return copy;
}

export function cloneAttribute(attr: EMAttribute): EMAttribute {
    return { ...attr, value: cloneValue(attr.value) };
}

export function cloneLiteral(value: EMLiteral): EMLiteral {
    return { ...value };
}

export function cloneValue(value?: EMLiteral): EMLiteral | undefined {
    return value ? cloneLiteral(value) : value;
}

/**
 * Finds node which is the deepest for in current node or node itself.
 */
export function findDeepest(node: Container): { node: Container, parent?: Container } {
    let parent: Container | undefined;
    while (node.items.length) {
        parent = node;
        node = node.items[node.items.length - 1];
    }

    return { parent, node };
}

export function isElement(node: EMNode): node is EMElement {
    return node.type === 'EMElement';
}

export function isGroup(node: EMNode): node is EMGroup {
    return node.type === 'EMGroup';
}

/**
 * Replaces unescaped token, consumed by `token` function, with value produced
 * by `value` function
 */
export function replaceToken<T>(text: string, token: (scanner: Scanner) => T, value: string | ((arg: T, scanner: Scanner) => string)): string {
    const scanner = new Scanner(text);
    let offset = 0;
    let result = '';
    let t: T;

    while (!scanner.eof()) {
        if (scanner.eat(92) /* \ */) {
            scanner.pos++;
        } else if (t = token(scanner)) {
            result += text.slice(offset, scanner.start)
                + (typeof value === 'string' ? value : value(t, scanner));
            offset = scanner.pos;
        } else {
            scanner.pos++;
        }
    }

    return result + text.slice(offset);
}

/**
 * Adds given `value` to deepest child of given node or node itself
 */
export function addToDeepest(node: Container, value: string) {
    const deepest = findDeepest(node);
    if (isElement(deepest.node)) {
        if (deepest.node.value) {
            deepest.node.value.type += value;
        } else {
            deepest.node.value = { type: 'EMLiteral', value };
        }
    }
}
