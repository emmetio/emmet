import Scanner from '@emmetio/scanner';
import consumeRepeat from './repeat';
import element from './element';
import { EMAbbreviation, EMElement, EMGroup, EMNode } from './ast';
import { Chars } from './utils';

export * from './ast';

type Container = EMAbbreviation | EMElement | EMGroup;

/**
 * Parses given string into a node tree
 * @param str Abbreviation to parse
 */
export default function parse(str: string): EMAbbreviation {
    const scanner = new Scanner(str);
    const root: EMAbbreviation = {
        type: 'EMAbbreviation',
        items: [],
        raw: str
    };
    let ctx: Container = root;
    const stack: Container[] = [];

    while (!scanner.eof()) {
        if (scanner.eat(Chars.GroupStart)) {
            const group: EMGroup = {
                type: 'EMGroup',
                items: [],
                start: scanner.pos - 1
            };
            ctx.items.push(group);
            stack.push(ctx);
            ctx = group;
        } else if (scanner.eat(Chars.GroupEnd)) {
            while (ctx && !isGroup(ctx)) {
                ctx = stack.pop()!;
            }

            if (!ctx) {
                throw scanner.error('Unexpected ")" group end');
            }

            ctx.end = scanner.pos;
            ctx.repeat = consumeRepeat(scanner);
            ctx = stack.pop()!;

            // For convenience, groups can be joined with optional `+` operator
            scanner.eat(Chars.Sibling);
        } else {
            const elem = element(scanner);
            ctx.items.push(elem);

            if (scanner.eof()) {
                break;
            }

            if (scanner.eat(Chars.Sibling)) {
                continue;
            } else if (scanner.eat(Chars.Child)) {
                stack.push(ctx);
                ctx = elem;
            } else if (scanner.eat(Chars.Climb)) {
                // it’s perfectly valid to have multiple `^` operators
                do {
                    ctx = stack.pop() || ctx;
                } while (scanner.eat(Chars.Climb));
            }
        }

    }

    return root;
}

function isGroup(node: EMNode): node is EMGroup {
    return node.type === 'EMGroup';
}
