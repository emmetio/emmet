import StreamReader from '@emmetio/stream-reader';
import { isAlphaNumeric } from '@emmetio/stream-reader/utils';
import attributes from './attribute';
import consumeLiteral from './literal';
import repeater from './repeat';
import { EMElement, EMLiteral, EMAttribute, EMRepeat } from './ast';
import { Chars, toAttribute, toLiteral } from './utils';

/**
 * Consumes a single element node from current abbreviation stream
 */
export default function consumeElement(stream: StreamReader): EMElement {
    const start = stream.pos;
    const name = identifier(stream);
    const node: EMElement = {
        type: 'EMElement',
        name: name && name.value,
        attributes: [],
        items: [],
        start: name && name.start
    };
    let attrs: EMAttribute[] | undefined;
    let repeat: EMRepeat | undefined;

    while (!stream.eof()) {
        if (stream.eat(Chars.Dot)) {
            addAttribute(node, 'class', identifier(stream));
        } else if (stream.eat(Chars.Hash)) {
            addAttribute(node, 'id', identifier(stream));
        } else if (stream.eat(Chars.Slash)) {
            // A self-closing indicator must be at the end of non-empty node
            if (isEmpty(node)) {
                stream.backUp(1);
                throw stream.error('Unexpected self-closing indicator');
            }
            node.selfClosing = true;
            if (repeat = repeater(stream)) {
                node.repeat = repeat;
            }
            break;
        } else if (attrs = attributes(stream)) {
            node.attributes = node.attributes.concat(attrs);
        } else if (stream.peek() === Chars.ExpressionStart) {
            node.value = consumeLiteral(stream);
        } else if (repeat = repeater(stream)) {
            node.repeat = repeat;
        } else {
            break;
        }
    }

    if (start === stream.pos) {
        throw stream.error(`Unable to consume abbreviation node, unexpected ${stream.peek()}`);
    }

    return node;
}

function identifier(stream: StreamReader): EMLiteral | undefined {
    const start = stream.pos;
    if (stream.eatWhile(isIdentifier)) {
        stream.start = start;
        return toLiteral(stream.current(), start, stream.pos);
    }
}

function isIdentifier(code: number) {
    return isAlphaNumeric(code)
        || code === 45 /* - */
        || code === 58 /* : */
        || code === 36 /* $ */
        || code === 64 /* @ */
        || code === 33 /* ! */
        || code === 95 /* _ */
        || code === 37 /* % */;
}

/**
 * Creates new attribute and adds it to given element
 */
function addAttribute(elem: EMElement, name?: string, value?: EMLiteral, start?: number, end?: number) {
    elem.attributes.push(toAttribute(name, value));
}

/**
 * Check if given element is empty, e.g. has no content
 */
function isEmpty(elem: EMElement): boolean {
    return !elem.name && !elem.value && !elem.attributes.length;
}
