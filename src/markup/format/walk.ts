import { AbbreviationNode, Abbreviation } from '@emmetio/abbreviation';
import { OutputStream } from '../../output-stream';

export type WalkNext = (node: AbbreviationNode, index: number, items: AbbreviationNode[]) => void;
export type Visitor<S extends WalkState> = (node: AbbreviationNode, index: number, items: AbbreviationNode[], state: S, next: WalkNext) => void;

export interface WalkState {
    /** Context node */
    current: AbbreviationNode;

    /** Immediate parent of currently iterated method */
    parent?: AbbreviationNode;

    /** List of all ancestors of context node */
    ancestors: AbbreviationNode[];

    /** Output stream */
    out: OutputStream;
}

export default function walk<S extends WalkState>(abbr: Abbreviation, visitor: Visitor<S>, state: S) {
    const callback = (ctx: AbbreviationNode, index: number, items: AbbreviationNode[]) => {
        visitor(ctx, index, items, state, next);
    };

    const next: WalkNext = (node, index, items) => {
        const { parent, current } = state;
        state.ancestors.push(current);
        state.parent = current;
        state.current = node;
        callback(node, index, items);
        state.current = current;
        state.parent = parent;
        state.ancestors.pop();
    };

    abbr.children.forEach(callback);
}
