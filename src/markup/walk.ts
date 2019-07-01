import { EMAbbreviation, EMElement, EMGroup } from '@emmetio/abbreviation';

export type Container = EMAbbreviation | EMElement | EMGroup;
export type WalkVisitor<T> = (node: Container, ancestors: Container[], state?: T) => void;

/**
 * Walks over each child node of given markup abbreviation AST node (including given
 * one) and invokes `fn` on each node.
 * The `fn` callback accepts context node, list of ancestor nodes and optional
 * state object
 */
export function walk<T>(node: Container, fn: WalkVisitor<T>, state?: T) {
    const ancestors: Container[] = [];
    const callback = (ctx: Container) => {
        ancestors.push(ctx);
        ctx.items.forEach(callback);
        ancestors.pop();
        fn(ctx, ancestors, state);
    };

    callback(node);
}
