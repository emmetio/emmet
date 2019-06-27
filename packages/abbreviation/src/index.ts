import StreamReader from '@emmetio/stream-reader';
import consumeRepeat from './repeat';
import consumeElement from './element';
import { EMAbbreviation, EMElement, EMGroup, EMNode } from './ast';
import { Chars } from './utils';

type Container = EMAbbreviation | EMElement | EMGroup;

/**
 * Parses given string into a node tree
 * @param str Abbreviation to parse
 */
export default function parse(str: string): EMAbbreviation {
    const stream = new StreamReader(str);
    const root: EMAbbreviation = {
        type: 'EMAbbreviation',
        items: [],
        raw: str
    };
    let ctx: Container = root;
    const stack: Container[] = [];

    while (!stream.eof()) {
        if (stream.eat(Chars.GroupStart)) {
            const group: EMGroup = {
                type: 'EMGroup',
                items: [],
                start: stream.pos - 1
            };
            ctx.items.push(group);
            stack.push(ctx);
            ctx = group;
            continue;
        }

        if (stream.eat(Chars.GroupEnd)) {
            while (ctx && !isGroup(ctx)) {
                ctx = stack.pop()!;
            }

            if (!ctx) {
                throw stream.error('Unexpected ")" group end');
            }

            ctx.end = stream.pos;
            ctx.repeat = consumeRepeat(stream);
            ctx = stack.pop()!;

            // For convenience, groups can be joined with optional `+` operator
            stream.eat(Chars.Sibling);
            continue;
        }

        const elem = consumeElement(stream);
        ctx.items.push(elem);

        if (stream.eof()) {
            break;
        }

        if (stream.eat(Chars.Sibling)) {
            continue;
        } else if (stream.eat(Chars.Child)) {
            stack.push(ctx);
            ctx = elem;
        } else if (stream.eat(Chars.Climb)) {
            // it’s perfectly valid to have multiple `^` operators
            do {
                ctx = stack.pop() || ctx;
            } while (stream.eat(Chars.Climb));
        }
    }

    return root;
}

function isGroup(node: EMNode): node is EMGroup {
    return node.type === 'EMGroup';
}
