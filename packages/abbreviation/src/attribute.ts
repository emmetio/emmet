import StreamReader from '@emmetio/stream-reader';
import { isWhiteSpace } from '@emmetio/stream-reader/utils';
import { EMAttribute, EMLiteral } from './ast';
import consumeLiteral from './literal';
import { Chars, toAttribute } from './utils';

const reAttributeName = /^\!?[\w\-:\$@]+\.?$/;

/**
 * Consumes attributes defined in square braces from given stream.
 * Example:
 * [attr col=3 title="Quoted string" selected. support={react}]
 * @returns Array of consumed attributes
 */
export default function attributeList(stream: StreamReader): EMAttribute[] | undefined {
    if (!stream.eat(Chars.AttrOpen)) {
        return;
    }

    const result: EMAttribute[] = [];
    let token: EMLiteral | undefined;

    while (!stream.eof()) {
        stream.eatWhile(isWhiteSpace);

        if (stream.eat(Chars.AttrClose)) {
            return result; // End of attribute set
        }

        if (token = consumeLiteral(stream)) {
            // Consumed literal from string: quoted literal is a value for
            // anonymous attribute, unquoted value could be either attribute name
            // or anonymous attribute value
            if (!token.before && reAttributeName.test(token.value)) {
                // Got unquoted literal, which is attribute name
                const value = stream.eat(Chars.Equals) ? consumeLiteral(stream) : void 0;
                result.push(applyOptions(toAttribute(token.value, value, token.start, stream.pos)));
            } else {
                // Got value for anonymous attribute
                result.push(toAttribute(void 0, token));
            }
        } else {
            throw stream.error('Expected attribute name');
        }
    }

    throw stream.error('Expected closing "]" brace');
}

/**
 * Apply options from just parsed attribute name
 */
function applyOptions(attr: EMAttribute): EMAttribute {
    // If a first character in attribute name is `!` — it’s an implied
    // default attribute
    let name = attr.name!;

    if (name!.charCodeAt(0) === Chars.Excl) {
        name = name.slice(1);
        attr.implied = true;
    }

    // Check for last character: if it’s a `.`, user wants boolean attribute
    if (name.charCodeAt(name.length - 1) === Chars.Dot) {
        name = name.slice(0, -1);
        attr.boolean = true;
    }

    attr.name = name;
    return attr;
}
