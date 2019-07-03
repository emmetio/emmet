import { EMAbbreviation, EMElement, EMGroup, EMStatement } from '@emmetio/abbreviation';

export type Container = EMAbbreviation | EMElement | EMGroup;
export type WalkVisitor<S> = (node: EMStatement, ancestors: Container[], state?: S) => void;

/**
 * Walks over each child node of given markup abbreviation AST node (not including
 * given one) and invokes `fn` on each node.
 * The `fn` callback accepts context node, list of ancestor nodes and optional
 * state object
 */
export function walk<S>(node: Container, fn: WalkVisitor<S>, state?: S) {
    const ancestors: Container[] = [node];
    const callback = (ctx: EMStatement) => {
        ancestors.push(ctx);
        ctx.items.forEach(callback);
        ancestors.pop();
        fn(ctx, ancestors, state);
    };

    node.items.forEach(callback);
}
