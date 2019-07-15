import { Name, Value, Repeater, AllTokens, BracketType, Bracket, Operator, OperatorType, Quote, WhiteSpace, Literal } from '../tokenizer';
import tokenScanner, { TokenScanner, peek, consume, readable, next, error, slice } from './TokenScanner';

export type TokenStatement = TokenElement | TokenGroup;

export interface TokenAttribute {
    name?: Value[];
    value?: Value[];
}

export interface TokenElement {
    type: 'TokenElement';
    name?: Name[];
    attributes?: TokenAttribute[];
    value?: Value[];
    repeat?: Repeater;
    selfClose: boolean;
    elements: TokenStatement[];
}

export interface TokenGroup {
    type: 'TokenGroup';
    elements: TokenStatement[];
    repeat?: Repeater;
}

export default function abbreviation(abbr: AllTokens[]): TokenGroup {
    const scanner = tokenScanner(abbr);
    const result = statements(scanner);
    if (readable(scanner)) {
        throw error(scanner, 'Unexpected character');
    }

    return result;
}

function statements(scanner: TokenScanner): TokenGroup {
    const result: TokenGroup = {
        type: 'TokenGroup',
        elements: []
    };

    let ctx: TokenStatement = result;
    let node: TokenStatement | undefined;
    const stack: TokenStatement[] = [];

    while (readable(scanner)) {
        if (node = element(scanner) || group(scanner)) {
            ctx.elements.push(node);
            if (consume(scanner, isChildOperator)) {
                stack.push(ctx);
                ctx = node;
            } else if (consume(scanner, isSiblingOperator)) {
                continue;
            } else if (consume(scanner, isClimbOperator)) {
                do {
                    if (stack.length) {
                        ctx = stack.pop()!;
                    }
                } while (consume(scanner, isClimbOperator));
            }
        } else {
            break;
        }
    }

    return result;
}

/**
 * Consumes group from given scanner
 */
function group(scanner: TokenScanner): TokenGroup | undefined {
    if (consume(scanner, isGroupStart)) {
        const result = statements(scanner);
        const token = next(scanner);
        if (isBracket(token, 'group', false)) {
            result.repeat = repeater(scanner);
            return result;
        }

        throw error(scanner, 'Expecting )', token);
    }
}

/**
 * Consumes single element from given scanner
 */
function element(scanner: TokenScanner): TokenElement | undefined {
    let attr: TokenAttribute | TokenAttribute[] | undefined;
    const elem: TokenElement = {
        type: 'TokenElement',
        name: void 0,
        attributes: void 0,
        value: void 0,
        repeat: void 0,
        selfClose: false,
        elements: []
    };

    if (identifier(scanner)) {
        elem.name = slice(scanner) as Name[];
    }

    while (readable(scanner)) {
        scanner.start = scanner.pos;
        if (!elem.repeat && !isEmpty(elem) && consume(scanner, isRepeater)) {
            elem.repeat = scanner.tokens[scanner.start] as Repeater;
        } else if (!elem.value && text(scanner)) {
            elem.value = slice(scanner) as Value[];
        } else if (attr = shortAttribute(scanner, 'id') || shortAttribute(scanner, 'class') || attributeSet(scanner)) {
            if (!elem.attributes) {
                elem.attributes = Array.isArray(attr) ? attr.slice() : [attr];
            } else {
                elem.attributes = elem.attributes.concat(attr);
            }
        } else if (consume(scanner, isCloseOperator)) {
            elem.selfClose = true;
            break;
        } else {
            break;
        }
    }

    return !isEmpty(elem) ? elem : void 0;
}

/**
 * Consumes attribute set from given scanner
 */
function attributeSet(scanner: TokenScanner): TokenAttribute[] | undefined {
    if (consume(scanner, isAttributeSetStart)) {
        const attributes: TokenAttribute[] = [];
        let attr: TokenAttribute | undefined;

        while (readable(scanner)) {
            if (attr = attribute(scanner)) {
                attributes.push(attr);
            } else if (consume(scanner, isAttributeSetEnd)) {
                break;
            } else if (!consume(scanner, isWhiteSpace)) {
                throw error(scanner, `Unexpected token "${peek(scanner)!.type}"`);
            }
        }

        return attributes.length ? attributes : void 0;
    }
}

/**
 * Consumes attribute shorthand (class or id) from given scanner
 */
function shortAttribute(scanner: TokenScanner, type: 'class' | 'id'): TokenAttribute | undefined {
    if (isOperator(peek(scanner), type)) {
        scanner.pos++;
        return {
            name: [createLiteral(type)],
            value: literal(scanner) ? slice(scanner) as Value[] : void 0
        };
    }
}

/**
 * Consumes single attribute from given scanner
 */
function attribute(scanner: TokenScanner): TokenAttribute | undefined {
    if (quoted(scanner)) {
        // Consumed quoted value: it’s a value for default attribute
        return {
            value: slice(scanner) as Value[]
        };
    }

    if (literal(scanner, true)) {
        return {
            name: slice(scanner) as Name[],
            value: consume(scanner, isEquals) && (quoted(scanner) || literal(scanner, true))
                ? slice(scanner) as Value[]
                : void 0
        };
    }
}

function repeater(scanner: TokenScanner): Repeater | undefined {
    return isRepeater(peek(scanner))
        ? scanner.tokens[scanner.pos++] as Repeater
        : void 0;
}

/**
 * Consumes quoted value from given scanner, if possible
 */
function quoted(scanner: TokenScanner): boolean {
    const start = scanner.pos;
    const quote = peek(scanner);
    if (isQuote(quote)) {
        scanner.pos++;
        while (readable(scanner)) {
            if (isQuote(next(scanner), quote.single)) {
                scanner.start = start;
                return true;
            }
        }

        throw error(scanner, 'Unclosed quote', quote);
    }

    return false;
}

/**
 * Consumes literal (unquoted value) from given scanner
 */
function literal(scanner: TokenScanner, allowBrackets?: boolean): boolean {
    const start = scanner.pos;
    const brackets: { [type in BracketType]: number } = {
        attribute: 0,
        expression: 0,
        group: 0
    };

    while (readable(scanner)) {
        const token = peek(scanner);

        if (isQuote(token) || isOperator(token) || isWhiteSpace(token) || isRepeater(token)) {
            break;
        }

        if (isBracket(token)) {
            if (!allowBrackets) {
                break;
            }

            if (token.open) {
                brackets[token.context]++;
            } else if (!brackets[token.context]) {
                // Stop if found unmatched closing brace: it must be handled
                // by parent consumer
                break;
            } else {
                brackets[token.context]--;
            }
        }

        scanner.pos++;
    }

    if (start !== scanner.pos) {
        scanner.start = start;
        return true;
    }

    return false;
}

/**
 * Consumes element identifier from given scanner
 */
function identifier(scanner: TokenScanner): boolean {
    return consume(scanner, isIdentifier);
}

/**
 * Consumes text value from given scanner
 */
function text(scanner: TokenScanner): boolean {
    const start = scanner.pos;
    if (consume(scanner, isTextStart)) {
        let brackets = 0;
        while (readable(scanner)) {
            const token = next(scanner);
            if (isBracket(token, 'expression')) {
                if (token.open) {
                    brackets++;
                } else if (!brackets) {
                    break;
                } else {
                    brackets--;
                }
            }
        }

        scanner.start = start;
        return true;
    }

    return false;
}

function isBracket(token: AllTokens | undefined, context?: BracketType, isOpen?: boolean): token is Bracket {
    return Boolean(token && token.type === 'Bracket'
        && (!context || token.context === context)
        && (isOpen == null || token.open === isOpen));
}

function isOperator(token: AllTokens | undefined, type?: OperatorType): token is Operator {
    return Boolean(token && token.type === 'Operator' && (!type || token.operator === type));
}

function isQuote(token: AllTokens | undefined, isSingle?: boolean): token is Quote {
    return Boolean(token && token.type === 'Quote' && (isSingle == null || token.single === isSingle));
}

function isWhiteSpace(token?: AllTokens): token is WhiteSpace {
    return Boolean(token && token.type === 'WhiteSpace');
}

function isEquals(token: AllTokens) {
    return isOperator(token, 'equal');
}

function isRepeater(token?: AllTokens): token is Repeater {
    return Boolean(token && token.type === 'Repeater');
}

function isIdentifier(token: AllTokens): boolean {
    return token.type === 'Literal' || token.type === 'RepeaterNumber' || token.type === 'RepeaterPlaceholder';
}

function isAttributeSetStart(token?: AllTokens) {
    return isBracket(token, 'attribute', true);
}

function isAttributeSetEnd(token?: AllTokens) {
    return isBracket(token, 'attribute', false);
}

function isTextStart(token: AllTokens) {
    return isBracket(token, 'expression', true);
}

function isGroupStart(token: AllTokens) {
    return isBracket(token, 'group', true);
}

function createLiteral(value: string): Literal {
    return { type: 'Literal', value };
}

function isEmpty(elem: TokenElement): boolean {
    return !elem.name && !elem.value && !elem.attributes;
}

function isChildOperator(token: AllTokens) {
    return isOperator(token, 'child');
}

function isSiblingOperator(token: AllTokens) {
    return isOperator(token, 'sibling');
}

function isClimbOperator(token: AllTokens) {
    return isOperator(token, 'climb');
}

function isCloseOperator(token: AllTokens) {
    return isOperator(token, 'close');
}
