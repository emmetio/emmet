import Scanner, { isAlphaWord, isAlpha, isNumber, isAlphaNumericWord, isSpace } from '@emmetio/scanner';
import { AllTokens, Literal, OperatorType, NumberValue, ColorValue, WhiteSpace, Operator, Bracket, StringValue, Field } from './tokens';
import { Chars } from './utils';

export * from './tokens';

export default function tokenize(abbr: string, isValue?: boolean): AllTokens[] {
    let brackets = 0;
    let token: AllTokens | undefined;
    const scanner = new Scanner(abbr);
    const tokens: AllTokens[] = [];

    while (!scanner.eof()) {
        token = field(scanner)
            || literal(scanner, brackets === 0 && !isValue)
            || numberValue(scanner)
            || colorValue(scanner)
            || stringValue(scanner)
            || bracket(scanner)
            || operator(scanner)
            || whiteSpace(scanner)
            || void 0;

        if (!token) {
            throw scanner.error('Unexpected character');
        }

        if (token.type === 'Bracket') {
            if (!brackets && token.open) {
                mergeTokens(scanner, tokens);
            }

            brackets += token.open ? 1 : -1;
            if (brackets < 0) {
                throw scanner.error('Unexpected bracket', token.start);
            }
        }

        tokens.push(token);

        // Forcibly consume next operator after unit-less numeric value or color:
        // next dash `-` must be used as value delimiter
        if (shouldConsumeDashAfter(token) && (token = operator(scanner))) {
            tokens.push(token);
        }
    }

    return tokens;
}

function field(scanner: Scanner): Field | undefined {
    const start = scanner.pos;
    if (scanner.eat(Chars.Dollar) && scanner.eat(Chars.CurlyBracketOpen)) {
        scanner.start = scanner.pos;

        let index: number | undefined;
        let name: string = '';

        if (scanner.eatWhile(isNumber)) {
            // It’s a field
            index = Number(scanner.current());
            name = scanner.eat(Chars.Colon) ? consumePlaceholder(scanner) : '';
        } else if (isAlpha(scanner.peek())) {
            // It’s a variable
            name = consumePlaceholder(scanner);
        }

        if (scanner.eat(Chars.CurlyBracketClose)) {
            return {
                type: 'Field',
                index, name,
                start,
                end: scanner.pos
            };
        }

        throw scanner.error('Expecting }');
    }

    // If we reached here then there’s no valid field here, revert
    // back to starting position
    scanner.pos = start;
}

/**
 * Consumes a placeholder: value right after `:` in field. Could be empty
 */
function consumePlaceholder(stream: Scanner): string {
    const stack: number[] = [];
    stream.start = stream.pos;

    while (!stream.eof()) {
        if (stream.eat(Chars.CurlyBracketOpen)) {
            stack.push(stream.pos);
        } else if (stream.eat(Chars.CurlyBracketClose)) {
            if (!stack.length) {
                stream.pos--;
                break;
            }
            stack.pop();
        } else {
            stream.pos++;
        }
    }

    if (stack.length) {
        stream.pos = stack.pop()!;
        throw stream.error(`Expecting }`);
    }

    return stream.current();
}

/**
 * Consumes literal from given scanner
 * @param short Use short notation for consuming value.
 * The difference between “short” and “full” notation is that first one uses
 * alpha characters only and used for extracting keywords from abbreviation,
 * while “full” notation also supports numbers and dashes
 */
function literal(scanner: Scanner, short?: boolean): Literal | undefined {
    const start = scanner.pos;

    if (scanner.eat(isIdentPrefix)) {
        // SCSS or LESS variable
        scanner.eatWhile(isKeyword);
    } else if (scanner.eat(isAlphaWord)) {
        scanner.eatWhile(short ? isAlphaWord : isKeyword);
    }

    if (start !== scanner.pos) {
        scanner.start = start;
        return createLiteral(scanner, scanner.start = start);
    }
}

function createLiteral(scanner: Scanner, start = scanner.start, end = scanner.pos): Literal {
    return {
        type: 'Literal',
        value: scanner.substring(start, end),
        start,
        end
    };
}

/**
 * Consumes numeric CSS value (number with optional unit) from current stream,
 * if possible
 */
function numberValue(scanner: Scanner): NumberValue | undefined {
    const start = scanner.start = scanner.pos;
    if (consumeNumber(scanner)) {
        scanner.start = start;
        const value = Number(scanner.current());

        // eat unit, which can be a % or alpha word
        scanner.start = scanner.pos;
        scanner.eat(Chars.Percent) || scanner.eatWhile(isAlphaWord);
        return {
            type: 'NumberValue',
            value,
            unit: scanner.current(),
            start,
            end: scanner.pos
        };
    }
}

/**
 * Consumes quoted string value from given scanner
 */
function stringValue(scanner: Scanner): StringValue | undefined {
    const ch = scanner.peek();
    const start = scanner.pos;
    let finished = false;

    if (ch === Chars.SingleQuote || ch === Chars.DoubleQuote) {
        scanner.pos++;
        while (!scanner.eof()) {
            // Do not throw error on malformed string
            if (scanner.eat(ch)) {
                finished = true;
                break;
            } else {
                scanner.pos++;
            }
        }

        scanner.start = start;
        return {
            type: 'StringValue',
            value: scanner.substring(start + 1, scanner.pos - (finished ? 1 : 0)),
            quote: ch === Chars.SingleQuote ? 'single' : 'double',
            start,
            end: scanner.pos
        };
    }
}

/**
 * Consumes a color token from given string
 */
function colorValue(scanner: Scanner): ColorValue | undefined {
    // supported color variations:
    // #abc   → #aabbccc
    // #0     → #000000
    // #fff.5 → rgba(255, 255, 255, 0.5)
    // #t     → transparent
    const start = scanner.pos;
    if (scanner.eat(Chars.Hash)) {
        scanner.start = scanner.pos;

        scanner.eat(Chars.Transparent) || scanner.eatWhile(isHex);
        const color = scanner.current();
        let alpha: string | undefined;

        // a hex color can be followed by `.num` alpha value
        scanner.start = scanner.pos;
        if (scanner.eat(Chars.Dot) && scanner.eatWhile(isNumber)) {
            alpha = scanner.current();
        }

        const { r, g, b, a } = parseColor(color, alpha);
        return {
            type: 'ColorValue',
            r, g, b, a,
            raw: scanner.substring(start + 1, scanner.pos),
            start,
            end: scanner.pos
        };
    }
}

/**
 * Consumes white space characters as string literal from given scanner
 */
function whiteSpace(scanner: Scanner): WhiteSpace | undefined {
    const start = scanner.pos;
    if (scanner.eatWhile(isSpace)) {
        return {
            type: 'WhiteSpace',
            start,
            end: scanner.pos
        };
    }
}

/**
 * Consumes bracket from given scanner
 */
function bracket(scanner: Scanner): Bracket | undefined {
    const ch = scanner.peek();
    if (ch === Chars.RoundBracketOpen || ch === Chars.RoundBracketClose) {
        return {
            type: 'Bracket',
            open: ch === Chars.RoundBracketOpen,
            start: scanner.pos++,
            end: scanner.pos
        };
    }
}

/**
 * Consumes operator from given scanner
 */
function operator(scanner: Scanner): Operator | undefined {
    const op = operatorType(scanner.peek());
    if (op) {
        return {
            type: 'Operator',
            operator: op,
            start: scanner.pos++,
            end: scanner.pos
        };
    }
}

/**
 * Eats number value from given stream
 * @return Returns `true` if number was consumed
 */
function consumeNumber(stream: Scanner): boolean {
    const start = stream.pos;
    stream.eat(Chars.Dash);
    const afterNegative = stream.pos;

    stream.eatWhile(isNumber);

    const prevPos = stream.pos;
    if (stream.eat(Chars.Dot) && !stream.eatWhile(isNumber)) {
        // Number followed by a dot, but then no number
        stream.pos = prevPos;
    }

    // Edge case: consumed dash only: not a number, bail-out
    if (stream.pos === afterNegative) {
        stream.pos = start;
    }

    return stream.pos !== start;
}

function isIdentPrefix(code: number): boolean {
    return code === Chars.At || code === Chars.Dollar;
}

/**
 * If given character is an operator, returns it’s type
 */
function operatorType(ch: number): OperatorType | undefined {
    return (ch === Chars.Sibling && OperatorType.Sibling)
        || (ch === Chars.Excl && OperatorType.Important)
        || (ch === Chars.Comma && OperatorType.ArgumentDelimiter)
        || (ch === Chars.Colon && OperatorType.PropertyDelimiter)
        || (ch === Chars.Dash && OperatorType.ValueDelimiter)
        || void 0;
}

/**
 * Check if given code is a hex value (/0-9a-f/)
 */
function isHex(code: number): boolean {
    return isNumber(code) || isAlpha(code, 65, 70); // A-F
}

function isKeyword(code: number): boolean {
    return isAlphaNumericWord(code) || code === Chars.Dash;
}

/**
 * Parses given color value from abbreviation into RGBA format
 */
function parseColor(value: string, alpha?: string): { r: number, g: number, b: number, a: number } {
    let r = '0';
    let g = '0';
    let b = '0';
    let a = Number(alpha != null && alpha !== '' ? alpha : 1);

    if (value === 't') {
        a = 0;
    } else {
        switch (value.length) {
            case 0:
                break;

            case 1:
                r = g = b = value + value;
                break;

            case 2:
                r = g = b = value;
                break;

            case 3:
                r = value[0] + value[0];
                g = value[1] + value[1];
                b = value[2] + value[2];
                break;

            default:
                value += value;
                r = value.slice(0, 2);
                g = value.slice(2, 4);
                b = value.slice(4, 6);
        }
    }

    return {
        r: parseInt(r, 16),
        g: parseInt(g, 16),
        b: parseInt(b, 16),
        a
    };
}

/**
 * Check if scanner reader must consume dash after given token.
 * Used in cases where user must explicitly separate numeric values
 */
function shouldConsumeDashAfter(token: AllTokens): boolean {
    return token.type === 'ColorValue' || (token.type === 'NumberValue' && !token.unit);
}

/**
 * Merges last adjacent tokens into a single literal.
 * This function is used to overcome edge case when function name was parsed
 * as a list of separate tokens. For example, a `scale3d()` value will be
 * parsed as literal and number tokens (`scale` and `3d`) which is a perfectly
 * valid abbreviation but undesired result. This function will detect last adjacent
 * literal and number values and combine them into single literal
 */
function mergeTokens(scanner: Scanner, tokens: AllTokens[]) {
    let start = 0;
    let end = 0;

    while (tokens.length) {
        const token = last(tokens)!;
        if (token.type === 'Literal' || token.type === 'NumberValue') {
            start = token.start!;
            if (!end) {
                end = token.end!;
            }
            tokens.pop();
        } else {
            break;
        }
    }

    if (start !== end) {
        tokens.push(createLiteral(scanner, start, end));
    }
}

function last<T>(arr: T[]): T | undefined {
    return arr[arr.length - 1];
}
