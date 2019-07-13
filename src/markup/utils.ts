import Scanner from '@emmetio/scanner';
import { EMNode, EMElement, EMGroup, EMString, EMRepeaterPlaceholder } from '@emmetio/abbreviation';
import { Container } from './walk';

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

export function isRepeaterPlaceholder(node: EMNode): node is EMRepeaterPlaceholder {
    return node.type === 'EMRepeaterPlaceholder';
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

export function stringToken(value: string): EMString {
    return { type: 'EMString', value };
}
