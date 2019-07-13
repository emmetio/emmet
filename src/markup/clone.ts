import { EMNode, EMAbbreviation, EMTokenGroup, EMGroup, EMElement, EMAttribute } from '@emmetio/abbreviation';

type Visitor<T extends EMNode = EMNode, U extends EMNode = EMNode> = (node: T, next: VisitorContinue<U>) => T;
type VisitorContinue<T extends EMNode> = (node?: T) => T;
interface VisitorMap {
    [nodeType: string]: Visitor;
}

const visitors: VisitorMap = {
    EMAbbreviation(node: EMAbbreviation, next) {
        return {
            ...node,
            items: node.items.map(next)
        } as EMAbbreviation;
    },
    EMTokenGroup(node: EMTokenGroup, next) {
        return {
            ...node,
            tokens: node.tokens.map(next)
        } as EMTokenGroup;
    },
    EMGroup(node: EMGroup, next) {
        return {
            ...node,
            items: node.items.map(next),
            repeat: node.repeat && next(node.repeat)
        } as EMGroup;
    },
    EMElement(node: EMElement, next) {
        return {
            ...node,
            name: node.name && next(node.name),
            value: node.value && next(node.value),
            repeat: node.repeat && next(node.repeat),
            attributes: node.attributes.map(next),
            items: node.items.map(next)
        } as EMElement;
    },
    EMAttribute(node: EMAttribute, next) {
        return {
            ...node,
            name: node.name && next(node.name),
            value: node.value && next(node.value),
        } as EMAttribute;
    },
    EMRepeat: copy,
    EMRepeaterValue: copy,
    EMRepeaterPlaceholder: copy,
    EMField: copy,
    EMString: copy,
    EMVariable: copy
};

export default function clone<T extends EMNode>(node: T): T {
    if (node.type in visitors) {
        return visitors[node.type](node, clone) as T;
    }

    throw new Error(`Unknown node type "${node.type}"`);
}

function copy<T extends EMNode>(node: T): T {
    return { ...node } as T;
}
