'use strict';

import Node from '@emmetio/node';
import StreamReader from '@emmetio/stream-reader';
import consumeRepeat from './repeat';
import consumeElement from './element';

const GROUP_START = 40; // (
const GROUP_END = 41; // )
const OP_SIBLING = 43; // +
const OP_CHILD = 62; // >
const OP_CLIMB = 94; // ^

/**
 * Parses given string into a node tree
 * @param str Abbreviation to parse
 */
export default function parse(str: string): Node {
    const stream = new StreamReader(str.trim());
    const root = new Node();
    let ctx = root;
    let ch: number;
    const groupStack: Array<[Node, Node, number]> = [];

    while (!stream.eof()) {
        ch = stream.peek();

        if (ch === GROUP_START) { // start of group
            // The grouping node should be detached to properly handle
            // out-of-bounds `^` operator. Node will be attached right on group end
            const n = new Node();
            groupStack.push([n, ctx, stream.pos]);
            ctx = n;
            stream.next();
            continue;
        } else if (ch === GROUP_END) { // end of group
            const lastGroup = groupStack.pop();
            if (!lastGroup) {
                throw stream.error('Unexpected ")" group end');
            }

            const n = lastGroup[0];
            ctx = lastGroup[1];
            stream.next();

            // a group can have a repeater
            if (n.repeat = consumeRepeat(stream)) {
                ctx.appendChild(n);
            } else {
                // move all children of group into parent node
                while (n.firstChild) {
                    ctx.appendChild(n.firstChild);
                }
            }
            // for convenience, groups can be joined with optional `+` operator
            stream.eat(OP_SIBLING);

            continue;
        }

        const node = consumeElement(stream);
        ctx.appendChild(node);

        if (stream.eof()) {
            break;
        }

        switch (stream.peek()) {
            case OP_SIBLING:
                stream.next();
                continue;

            case OP_CHILD:
                stream.next();
                ctx = node;
                continue;

            case OP_CLIMB:
                // it’s perfectly valid to have multiple `^` operators
                while (stream.eat(OP_CLIMB)) {
                    ctx = ctx.parent || ctx;
                }
                continue;
            default:
                // no-default
        }
    }

    if (groupStack.length) {
        stream.pos = groupStack.pop()![2];
        throw stream.error('Expected group close');
    }

    return root;
}
