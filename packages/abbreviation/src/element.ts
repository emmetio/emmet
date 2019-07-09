import Scanner, { isAlphaNumeric } from '@emmetio/scanner';
import { EMElement, EMLiteral, EMAttribute, EMRepeat, EMIdentifier } from './ast';
import attributes from './attributes';
import repeater from './repeater';
import unquoted from './unquoted';
import expression from './expression';
import { AllowedTokens } from './next-token';
import { Chars } from './utils';

/**
 * Consumes a single element node from current abbreviation stream
 */
export default function element(scanner: Scanner): EMElement {
    const start = scanner.pos;
    const node: EMElement = {
        type: 'EMElement',
        name: tagIdentifier(scanner),
        attributes: [],
        items: [],
        start
    };
    let attrs: EMAttribute[] | undefined;
    let repeat: EMRepeat | undefined;

    while (!scanner.eof()) {
        scanner.start = scanner.pos;
        if (scanner.eat(Chars.Dot)) {
            addAttribute(node, createIdentifier(scanner, 'class'), attrIdentifier(scanner));
        } else if (scanner.eat(Chars.Hash)) {
            addAttribute(node, createIdentifier(scanner, 'id'), attrIdentifier(scanner));
        } else if (scanner.eat(Chars.Slash)) {
            // A self-closing indicator must be at the end of non-empty node
            if (isEmpty(node)) {
                scanner.backUp(1);
                throw scanner.error('Unexpected self-closing indicator');
            }
            node.selfClosing = true;
            if (repeat = repeater(scanner)) {
                node.repeat = repeat;
            }
            break;
        } else if (attrs = attributes(scanner)) {
            node.attributes = node.attributes.concat(attrs);
        } else if (scanner.peek() === Chars.ExpressionStart) {
            node.value = expression(scanner);
        } else if (repeat = repeater(scanner)) {
            node.repeat = repeat;
        } else {
            break;
        }
    }

    if (start === scanner.pos) {
        throw scanner.error(`Unable to consume abbreviation node, unexpected ${scanner.peek()}`);
    }

    return node;
}

function createIdentifier(scanner: Scanner, value: string): EMIdentifier {
    return {
        type: 'EMTokenGroup',
        raw: scanner.current(),
        tokens: [{ type: 'EMString', value }],
        start: scanner.start,
        end: scanner.end
    };
}

function tagIdentifier(scanner: Scanner): EMIdentifier | undefined {
    return unquoted(scanner, 0, AllowedTokens.Numbering, isIdentifier);
}

function attrIdentifier(scanner: Scanner): EMLiteral | undefined {
    return unquoted(scanner, 0, AllowedTokens.All, isIdentifier);
}

function isIdentifier(code: number): boolean {
    return isAlphaNumeric(code)
        || code === Chars.Dash
        || code === Chars.Colon
        || code === Chars.Underscore;
}

/**
 * Creates new attribute and adds it to given element
 */
function addAttribute(elem: EMElement, name?: EMIdentifier, value?: EMLiteral, start?: number, end?: number) {
    elem.attributes.push({ type: 'EMAttribute', name, value, start, end });
}

/**
 * Check if given element is empty, e.g. has no content
 */
function isEmpty(elem: EMElement): boolean {
    return !elem.name && !elem.value && !elem.attributes.length;
}
