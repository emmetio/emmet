import Scanner from '@emmetio/scanner';
import { isWhiteSpace, isAlphaNumericWord } from '@emmetio/scanner/utils';
import { EMAttribute, EMLiteral, EMIdentifier, EMIdentifierTokens } from './ast';
import quoted from './quoted';
import unquoted, { AllowedChars } from './unquoted';
import expression from './expression';
import { Chars } from './utils';
import { AllowedTokens } from './next-token';

/**
 * Consumes attributes defined in square braces from given stream.
 * Example:
 * [attr col=3 title="Quoted string" selected. support={react}]
 * @returns Array of consumed attributes
 */
export default function attributeList(scanner: Scanner): EMAttribute[] | undefined {
    if (!scanner.eat(Chars.AttrOpen)) {
        return;
    }

    const result: EMAttribute[] = [];
    let token: EMLiteral | undefined;

    while (!scanner.eof()) {
        scanner.eatWhile(isWhiteSpace);

        if (scanner.eat(Chars.AttrClose)) {
            return result; // End of attribute set
        }

        if (token = unquoted(scanner, AllowedChars.All, AllowedTokens.Numbering, isAttributeName)) {
            // Consumed attribute name
            const value = scanner.eat(Chars.Equals) ? literal(scanner) : void 0;
            result.push(toAttribute(token as EMIdentifier, value));
        } else if (token = literal(scanner)) {
            // Got value for anonymous attribute
            result.push(toAttribute(void 0, token));
        } else {
            throw scanner.error('Expected attribute name');
        }
    }

    throw scanner.error('Expected closing "]" brace');
}

function literal(stream: Scanner): EMLiteral | undefined {
    return quoted(stream) || expression(stream) || unquoted(stream, AllowedChars.All, AllowedTokens.All);
}

function isAttributeName(ch: number) {
    return ch === Chars.Excl || ch === Chars.At || ch === Chars.Dot
        || ch === Chars.Dash || ch === Chars.Colon || isAlphaNumericWord(ch);
}

/**
 * Attribute AST node factory
 */
function toAttribute(name?: EMIdentifier, value?: EMLiteral): EMAttribute {
    const startToken = name || value;
    const endToken = value || name;
    return {
        type: 'EMAttribute',
        name,
        value,
        implied: readImplied(name && name.tokens[0]),
        boolean: readBoolean(name && name.tokens[name.tokens.length - 1]),
        start: startToken && startToken.start,
        end: endToken && endToken.end
    };
}

/**
 * Reads `implied` option from given attribute name token and modifies it, if required
 */
function readImplied(token?: EMIdentifierTokens): boolean {
    if (token && token.type === 'EMString' && token.value[0] === '!') {
        token.value = token.value.slice(1);
        if (token.start != null) {
            token.start++;
        }
        return true;
    }

    return false;
}

/**
 * Reads `boolean` option from given attribute name token and modifies it, if required
 */
function readBoolean(token?: EMIdentifierTokens): boolean {
    if (token && token.type === 'EMString' && token.value.slice(-1) === '.') {
        token.value = token.value.slice(0, -1);
        if (token.end != null) {
            token.end--;
        }

        return true;
    }

    return false;
}
