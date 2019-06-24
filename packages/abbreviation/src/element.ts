import Node from '@emmetio/node';
import StreamReader from '@emmetio/stream-reader';
import { isAlphaNumeric } from '@emmetio/stream-reader/utils';
import consumeAttributes from './attribute';
import consumeTextNode from './text';
import consumeRepeat from './repeat';

const HASH = 35; // #
const DOT = 46; // .
const SLASH = 47; // /

/**
 * Consumes a single element node from current abbreviation stream
 */
export default function consumeElement(stream: StreamReader): Node {
    // consume element name, if provided
    const start = stream.pos;
    const node = new Node(eatName(stream));
    let next: any;

    while (!stream.eof()) {
        if (stream.eat(DOT)) {
            node.addClass(eatName(stream));
        } else if (stream.eat(HASH)) {
            node.setAttribute('id', eatName(stream));
        } else if (stream.eat(SLASH)) {
            // A self-closing indicator must be at the end of non-grouping node
            if (node.isGroup) {
                stream.backUp(1);
                throw stream.error('Unexpected self-closing indicator');
            }
            node.selfClosing = true;
            if (next = consumeRepeat(stream)) {
                node.repeat = next;
            }
            break;
        } else if (next = consumeAttributes(stream)) {
            for (let i = 0, il = next.length; i < il; i++) {
                node.setAttribute(next[i]);
            }
        } else if ((next = consumeTextNode(stream)) !== null) {
            node.value = next;
        } else if (next = consumeRepeat(stream)) {
            node.repeat = next;
        } else {
            break;
        }
    }

    if (start === stream.pos) {
        throw stream.error(`Unable to consume abbreviation node, unexpected ${stream.peek()}`);
    }

    return node;
}

function eatName(stream: StreamReader): string {
    stream.start = stream.pos;
    stream.eatWhile(isName);
    return stream.current();
}

function isName(code: number) {
    return isAlphaNumeric(code)
        || code === 45 /* - */
        || code === 58 /* : */
        || code === 36 /* $ */
        || code === 64 /* @ */
        || code === 33 /* ! */
        || code === 95 /* _ */
        || code === 37 /* % */;
}
