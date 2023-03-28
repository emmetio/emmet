import type { NameToken, ValueToken, Repeater, AllTokens, BracketType, Bracket, Operator, OperatorType, Quote, WhiteSpace, Literal } from '../tokenizer/index.js';
import tokenScanner, { TokenScanner, peek, consume, readable, next, error, slice } from './TokenScanner.js';
import type { ParserOptions } from '../types.js';

export type TokenStatement = TokenElement | TokenGroup;

export interface TokenAttribute {
    name?: ValueToken[];
    value?: ValueToken[];
    expression?: boolean;
    /**
     * Indicates that current attribute was repeated multiple times in a row.
     * Used to alter output of multiple shorthand attributes like `..` (double class)
     */
    multiple?: boolean;
}

export interface TokenElement {
    type: 'TokenElement';
    name?: NameToken[];
    attributes?: TokenAttribute[];
    value?: ValueToken[];
    repeat?: Repeater;
    selfClose: boolean;
    elements: TokenStatement[];
}

export interface TokenGroup {
    type: 'TokenGroup';
    elements: TokenStatement[];
    repeat?: Repeater;
}

export default function abbreviation(abbr: AllTokens[], options: ParserOptions = {}): TokenGroup {
    const scanner = tokenScanner(abbr);
    const result = statements(scanner, options);
    if (readable(scanner)) {
        throw error(scanner, 'Unexpected character');
    }

    return result;
}

function statements(scanner: TokenScanner, options: ParserOptions): TokenGroup {
    const result: TokenGroup = {
        type: 'TokenGroup',
        elements: []
    };

    let ctx: TokenStatement = result;
    let node: TokenStatement | undefined;
    const stack: TokenStatement[] = [];

    while (readable(scanner)) {
        if (node = element(scanner, options) || group(scanner, options)) {
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
function group(scanner: TokenScanner, options: ParserOptions): TokenGroup | undefined {
    if (consume(scanner, isGroupStart)) {
        const result = statements(scanner, options);
        const token = next(scanner);
        if (isBracket(token, 'group', false)) {
            result.repeat = repeater(scanner);
        }
        return result;
    }
}

/**
 * Consumes single element from given scanner
 */
function element(scanner: TokenScanner, options: ParserOptions): TokenElement | undefined {
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

    if (elementName(scanner, options)) {
        elem.name = slice(scanner) as NameToken[];
    }

    while (readable(scanner)) {
        scanner.start = scanner.pos;
        if (!elem.repeat && !isEmpty(elem) && consume(scanner, isRepeater)) {
            elem.repeat = scanner.tokens[scanner.pos - 1] as Repeater;
        } else if (!elem.value && text(scanner)) {
            elem.value = getText(scanner);
        } else if (attr = shortAttribute(scanner, 'id', options) || shortAttribute(scanner, 'class', options) || attributeSet(scanner)) {
            if (!elem.attributes) {
                elem.attributes = Array.isArray(attr) ? attr.slice() : [attr];
            } else {
                elem.attributes = elem.attributes.concat(attr);
            }
        } else {
            if (!isEmpty(elem) && consume(scanner, isCloseOperator)) {
                elem.selfClose = true;
                if (!elem.repeat && consume(scanner, isRepeater)) {
                    elem.repeat = scanner.tokens[scanner.pos - 1] as Repeater;
                }
            }
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
                throw error(scanner, `Unexpected "${peek(scanner)!.type}" token`);
            }
        }

        return attributes;
    }
}

/**
 * Consumes attribute shorthand (class or id) from given scanner
 */
function shortAttribute(scanner: TokenScanner, type: 'class' | 'id', options: ParserOptions): TokenAttribute | undefined {
    if (isOperator(peek(scanner), type)) {
        scanner.pos++;

        // Consume multiple operators
        let count = 1;
        while (isOperator(peek(scanner), type)) {
            scanner.pos++;
            count++;
        }

        const attr: TokenAttribute = {
            name: [createLiteral(type)]
        };

        if (count > 1) {
            attr.multiple = true;
        }

        // Consume expression after shorthand start for React-like components
        if (options.jsx && text(scanner)) {
            attr.value = getText(scanner);
            attr.expression = true;
        } else {
            attr.value = literal(scanner) ? slice(scanner) as ValueToken[] : void 0;
        }

        return attr;
    }
}

/**
 * Consumes single attribute from given scanner
 */
function attribute(scanner: TokenScanner): TokenAttribute | undefined {
    if (quoted(scanner)) {
        // Consumed quoted value: it’s a value for default attribute
        return {
            value: slice(scanner) as ValueToken[]
        };
    }

    if (literal(scanner, true)) {
        const name = slice(scanner) as NameToken[];
        let value: ValueToken[] | undefined;
        if (consume(scanner, isEquals)) {
            if (quoted(scanner) || literal(scanner, true)) {
                value = slice(scanner) as ValueToken[];
            }
        }

        return { name, value };
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
        if (brackets.expression) {
            // If we’re inside expression, we should consume all content in it
            if (isBracket(token, 'expression')) {
                brackets[token.context] += token.open ? 1 : -1;
            }
        } else if (isQuote(token) || isOperator(token) || isWhiteSpace(token) || isRepeater(token)) {
            break;
        } else if (isBracket(token)) {
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
 * Consumes element name from given scanner
 */
function elementName(scanner: TokenScanner, options: ParserOptions): boolean {
    const start = scanner.pos;

    if (options.jsx && consume(scanner, isCapitalizedLiteral)) {
        // Check for edge case: consume immediate capitalized class names
        // for React-like components, e.g. `Foo.Bar.Baz`
        while (readable(scanner)) {
            const { pos } = scanner;
            if (!consume(scanner, isClassNameOperator) || !consume(scanner, isCapitalizedLiteral)) {
                scanner.pos = pos;
                break;
            }
        }
    }

    while (readable(scanner) && consume(scanner, isElementName)) {
        // empty
    }

    if (scanner.pos !== start) {
        scanner.start = start;
        return true;
    }

    return false;
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

function getText(scanner: TokenScanner): ValueToken[] {
    let from = scanner.start;
    let to = scanner.pos;
    if (isBracket(scanner.tokens[from], 'expression', true)) {
        from++;
    }

    if (isBracket(scanner.tokens[to - 1], 'expression', false)) {
        to--;
    }

    return slice(scanner, from, to) as ValueToken[];
}

export function isBracket(token: AllTokens | undefined, context?: BracketType, isOpen?: boolean): token is Bracket {
    return Boolean(token && token.type === 'Bracket'
        && (!context || token.context === context)
        && (isOpen == null || token.open === isOpen));
}

export function isOperator(token: AllTokens | undefined, type?: OperatorType): token is Operator {
    return Boolean(token && token.type === 'Operator' && (!type || token.operator === type));
}

export function isQuote(token: AllTokens | undefined, isSingle?: boolean): token is Quote {
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

function isLiteral(token: AllTokens): token is Literal {
    return token.type === 'Literal';
}

function isCapitalizedLiteral(token: AllTokens) {
    if (isLiteral(token)) {
        const ch = token.value.charCodeAt(0);
        return ch >= 65 && ch <= 90;
    }
    return false;
}

function isElementName(token: AllTokens): boolean {
    return token.type === 'Literal' || token.type === 'RepeaterNumber' || token.type === 'RepeaterPlaceholder';
}

function isClassNameOperator(token: AllTokens) {
    return isOperator(token, 'class');
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
