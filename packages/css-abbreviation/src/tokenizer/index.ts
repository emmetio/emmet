import Scanner, { isAlphaWord, isAlpha, isNumber, isAlphaNumericWord, isSpace } from '@emmetio/scanner';
import { AllTokens, Literal, OperatorType, NumberValue, ColorValue, WhiteSpace, Operator, Bracket, StringValue } from './tokens';
import { Chars } from './utils';

export default function tokenize(abbr: string): AllTokens[] {
    let brackets = 0;
    let token: AllTokens | undefined;
    const scanner = new Scanner(abbr);
    const tokens: AllTokens[] = [];

    while (!scanner.eof()) {
        token = bracket(scanner)
            || operator(scanner)
            || literal(scanner, true)
            || numberValue(scanner)
            || colorValue(scanner)
            || stringValue(scanner)
            || (brackets && whiteSpace(scanner))
            || void 0;

        if (!token) {
            throw scanner.error('Unexpected character');
        }

        if (token.type === 'Bracket') {
            brackets += token.open ? 1 : -1;
            if (brackets < 0) {
                throw scanner.error('Unexpected bracket', token.start);
            }
        }

        tokens.push(token);
    }

    return tokens;
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
    } else {
        scanner.eatWhile(short ? isAlphaWord : isKeyword);
    }

    if (scanner.start !== scanner.pos) {
        return {
            type: 'Literal',
            value: scanner.current(),
            start,
            end: scanner.pos
        };
    }
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
    if (ch === Chars.SingleQuote || ch === Chars.DoubleQuote) {
        scanner.pos++;
        while (!scanner.eof()) {
            if (scanner.eat(ch)) {
                break;
            } else {
                scanner.pos++;
            }
        }

        scanner.start = start;
        return {
            type: 'StringValue',
            value: scanner.current(),
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
        const base = scanner.current();
        let alpha: number | undefined;

        // a hex color can be followed by `.num` alpha value
        scanner.start = scanner.pos;
        if (scanner.eat(Chars.Dot)) {
            if (scanner.eatWhile(isNumber)) {
                alpha = Number(scanner.current());
            } else {
                throw scanner.error('Unexpected character for alpha value of color');
            }
        }

        return {
            type: 'ColorValue',
            base,
            alpha,
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
    return (ch === Chars.Sibling && 'sibling')
        || (ch === Chars.Excl && 'important')
        || (ch === Chars.Comma && 'argument-delimiter')
        || (ch === Chars.Colon && 'property-delimiter')
        || (ch === Chars.Dash && 'value-delimiter')
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
