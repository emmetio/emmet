import { Abbreviation, AbbreviationNode } from '@emmetio/abbreviation';

export type Container = Abbreviation | AbbreviationNode;
export type WalkVisitor<S> = (node: AbbreviationNode, ancestors: Container[], state?: S) => void;

/**
 * Walks over each child node of given markup abbreviation AST node (not including
 * given one) and invokes `fn` on each node.
 * The `fn` callback accepts context node, list of ancestor nodes and optional
 * state object
 */
export function walk<S>(node: Container, fn: WalkVisitor<S>, state?: S) {
    const ancestors: Container[] = [node];
    const callback = (ctx: AbbreviationNode) => {
        fn(ctx, ancestors, state);
        ancestors.push(ctx);
        ctx.children.forEach(callback);
        ancestors.pop();
    };

    node.children.forEach(callback);
}

/**
 * Finds node which is the deepest for in current node or node itself.
 */
export function findDeepest(node: Container): { node: Container, parent?: Container } {
    let parent: Container | undefined;
    while (node.children.length) {
        parent = node;
        node = node.children[node.children.length - 1];
    }

    return { parent, node };
}

export function isNode(node: Container): node is AbbreviationNode {
    return node.type === 'AbbreviationNode';
}
