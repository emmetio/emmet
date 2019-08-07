import { AbbreviationNode, Abbreviation } from '@emmetio/abbreviation';
import createOutputStream, { OutputStream } from '../../output-stream';
import { Config } from '../../config';

export type WalkNext = (node: AbbreviationNode, index: number, items: AbbreviationNode[]) => void;
export type Visitor<S extends WalkState> = (node: AbbreviationNode, index: number, items: AbbreviationNode[], state: S, next: WalkNext) => void;

export interface WalkState {
    /** Context node */
    current: AbbreviationNode;

    /** Immediate parent of currently iterated method */
    parent?: AbbreviationNode;

    /** List of all ancestors of context node */
    ancestors: AbbreviationNode[];

    /** Current output config */
    config: Config;

    /** Output stream */
    out: OutputStream;

    /** Current field index, used to output field marks for editor tabstops */
    field: number;
}

export default function walk<S extends WalkState>(abbr: Abbreviation, visitor: Visitor<S>, state: S) {
    const callback = (ctx: AbbreviationNode, index: number, items: AbbreviationNode[]) => {
        const { parent, current } = state;
        state.parent = current;
        state.current = ctx;
        visitor(ctx, index, items, state, next);
        state.current = current;
        state.parent = parent;
    };

    const next: WalkNext = (node, index, items) => {
        state.ancestors.push(state.current);
        callback(node, index, items);
        state.ancestors.pop();
    };

    abbr.children.forEach(callback);
}

export function createWalkState(config: Config): WalkState {
    return {
        // @ts-ignore: Will set value in iterator
        current: null,
        parent: void 0,
        ancestors: [],
        config,
        field: 1,
        out: createOutputStream(config.options)
    };
}
