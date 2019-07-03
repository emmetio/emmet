import { EMStatement, EMAttribute, EMLiteral, EMNode, EMElement, EMGroup } from '@emmetio/abbreviation';
import { Container } from './walk';

/**
 * Creates deep copy of given abbreviation node
 */
export function clone(node: EMStatement): EMStatement {
    const copy: EMStatement = {
        ...node,
        items: node.items.map(clone)
    };

    if (copy.repeat) {
        copy.repeat = { ...copy.repeat };
    }

    if (copy.type === 'EMElement') {
        copy.attributes = copy.attributes.map(cloneAttribute);
        copy.value = cloneValue(copy.value);
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
