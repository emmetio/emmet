import Scanner, { isSpace, isQuote, isNumber, isAlpha, isAlphaNumericWord, isUmlaut } from '@emmetio/scanner';
import type { Literal, WhiteSpace, Quote, Bracket, BracketType, OperatorType, Operator, RepeaterPlaceholder, Repeater, Field, RepeaterNumber, AllTokens } from './tokens.js';
import { Chars, escaped } from './utils.js';

export * from './tokens.js';

type Context =  { [ctx in BracketType]: number } & { quote: number };

export default function tokenize(source: string): AllTokens[] {
    const scanner = new Scanner(source);
    const result: AllTokens[] = [];
    const ctx: Context = {
        group: 0,
        attribute: 0,
        expression: 0,
        quote: 0
    };

    let ch = 0;
    let token: AllTokens | undefined;

    while (!scanner.eof()) {
        ch = scanner.peek();
        token = getToken(scanner, ctx);

        if (token) {
            result.push(token);
            if (token.type === 'Quote') {
                ctx.quote = ch === ctx.quote ? 0 : ch;
            } else if (token.type === 'Bracket') {
                ctx[token.context] += token.open ? 1 : -1;
            }
        } else {
            throw scanner.error('Unexpected character');
        }
    }

    return result;
}

/**
 * Returns next token from given scanner, if possible
 */
export function getToken(scanner: Scanner, ctx: Context): AllTokens | undefined {
    return field(scanner, ctx)
        || repeaterPlaceholder(scanner)
        || repeaterNumber(scanner)
        || repeater(scanner)
        || whiteSpace(scanner)
        || literal(scanner, ctx)
        || operator(scanner)
        || quote(scanner)
        || bracket(scanner);
}

/**
 * Consumes literal from given scanner
 */
function literal(scanner: Scanner, ctx: Context): Literal | undefined {
    const start = scanner.pos;
    const expressionStart = ctx.expression;
    let value = '';

    while (!scanner.eof()) {
        // Consume escaped sequence no matter of context
        if (escaped(scanner)) {
            value += scanner.current();
            continue;
        }

        const ch = scanner.peek();

        if (ch === Chars.Slash && !ctx.quote && !ctx.expression && !ctx.attribute) {
            // Special case for `/` character between numbers in class names
            const prev = scanner.string.charCodeAt(scanner.pos - 1);
            const next = scanner.string.charCodeAt(scanner.pos + 1);
            if (isNumber(prev) && isNumber(next)) {
                value += scanner.string[scanner.pos++];
                continue;
            }
        }

        if (ch === ctx.quote || ch === Chars.Dollar || isAllowedOperator(ch, ctx)) {
            // 1. Found matching quote
            // 2. The `$` character has special meaning in every context
            // 3. Depending on context, some characters should be treated as operators
            break;
        }

        if (expressionStart) {
            // Consume nested expressions, e.g. span{{foo}}
            if (ch === Chars.CurlyBracketOpen) {
                ctx.expression++;
            } else if (ch === Chars.CurlyBracketClose) {
                if (ctx.expression > expressionStart) {
                    ctx.expression--;
                } else {
                    break;
                }
            }
        } else if (!ctx.quote) {
            // Consuming element name
            if (!ctx.attribute && !isElementName(ch)) {
                break;
            }

            if (isAllowedSpace(ch, ctx) || isAllowedRepeater(ch, ctx) || isQuote(ch) || bracketType(ch)) {
                // Stop for characters not allowed in unquoted literal
                break;
            }
        }

        value += scanner.string[scanner.pos++];
    }

    if (start !== scanner.pos) {
        scanner.start = start;
        return {
            type: 'Literal',
            value,
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
            end: scanner.pos,
            value: scanner.substring(start, scanner.pos)
        };
    }
}

/**
 * Consumes quote from given scanner
 */
function quote(scanner: Scanner): Quote | undefined {
    const ch = scanner.peek();
    if (isQuote(ch)) {
        return {
            type: 'Quote',
            single: ch === Chars.SingleQuote,
            start: scanner.pos++,
            end: scanner.pos
        };
    }
}

/**
 * Consumes bracket from given scanner
 */
function bracket(scanner: Scanner): Bracket | undefined {
    const ch = scanner.peek();
    const context = bracketType(ch);
    if (context) {
        return {
            type: 'Bracket',
            open: isOpenBracket(ch),
            context,
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
 * Consumes node repeat token from current stream position and returns its
 * parsed value
 */
function repeater(scanner: Scanner): Repeater | undefined {
    const start = scanner.pos;
    if (scanner.eat(Chars.Asterisk)) {
        scanner.start = scanner.pos;
        let count = 1;
        let implicit = false;

        if (scanner.eatWhile(isNumber)) {
            count = Number(scanner.current());
        } else {
            implicit = true;
        }

        return {
            type: 'Repeater',
            count,
            value: 0,
            implicit,
            start,
            end: scanner.pos
        };
    }
}

/**
 * Consumes repeater placeholder `$#` from given scanner
 */
function repeaterPlaceholder(scanner: Scanner): RepeaterPlaceholder | undefined {
    const start = scanner.pos;
    if (scanner.eat(Chars.Dollar) && scanner.eat(Chars.Hash)) {
        return {
            type: 'RepeaterPlaceholder',
            value: void 0,
            start,
            end: scanner.pos
        };
    }

    scanner.pos = start;
}

/**
 * Consumes numbering token like `$` from given scanner state
 */
function repeaterNumber(scanner: Scanner): RepeaterNumber | undefined {
    const start = scanner.pos;
    if (scanner.eatWhile(Chars.Dollar)) {
        const size = scanner.pos - start;
        let reverse = false;
        let base = 1;
        let parent = 0;

        if (scanner.eat(Chars.At)) {
            // Consume numbering modifiers
            while (scanner.eat(Chars.Climb)) {
                parent++;
            }

            reverse = scanner.eat(Chars.Dash);
            scanner.start = scanner.pos;
            if (scanner.eatWhile(isNumber)) {
                base = Number(scanner.current());
            }
        }

        scanner.start = start;

        return {
            type: 'RepeaterNumber',
            size,
            reverse,
            base,
            parent,
            start,
            end: scanner.pos
        };
    }
}

function field(scanner: Scanner, ctx: Context): Field | undefined {
    const start = scanner.pos;
    // Fields are allowed inside expressions and attributes
    if ((ctx.expression || ctx.attribute) && scanner.eat(Chars.Dollar) && scanner.eat(Chars.CurlyBracketOpen)) {
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
 * Check if given character code is an operator and it’s allowed in current context
 */
function isAllowedOperator(ch: number, ctx: Context): boolean {
    const op = operatorType(ch);
    if (!op || ctx.quote || ctx.expression) {
        // No operators inside quoted values or expressions
        return false;
    }

    // Inside attributes, only `equals` is allowed
    return !ctx.attribute || op === 'equal';
}

/**
 * Check if given character is a space character and is allowed to be consumed
 * as a space token in current context
 */
function isAllowedSpace(ch: number, ctx: Context): boolean {
    return isSpace(ch) && !ctx.expression;
}

/**
 * Check if given character can be consumed as repeater in current context
 */
function isAllowedRepeater(ch: number, ctx: Context): boolean {
    return ch === Chars.Asterisk && !ctx.attribute && !ctx.expression;
}

/**
 * If given character is a bracket, returns it’s type
 */
function bracketType(ch: number): BracketType | undefined {
    if (ch === Chars.RoundBracketOpen || ch === Chars.RoundBracketClose) {
        return 'group';
    }

    if (ch === Chars.SquareBracketOpen || ch === Chars.SquareBracketClose) {
        return 'attribute';
    }

    if (ch === Chars.CurlyBracketOpen || ch === Chars.CurlyBracketClose) {
        return 'expression';
    }
}

/**
 * If given character is an operator, returns it’s type
 */
function operatorType(ch: number): OperatorType | undefined {
    return (ch === Chars.Child && 'child')
        || (ch === Chars.Sibling && 'sibling')
        || (ch === Chars.Climb && 'climb')
        || (ch === Chars.Dot && 'class')
        || (ch === Chars.Hash && 'id')
        || (ch === Chars.Slash && 'close')
        || (ch === Chars.Equals && 'equal')
        || void 0;
}

/**
 * Check if given character is an open bracket
 */
function isOpenBracket(ch: number): boolean {
    return ch === Chars.CurlyBracketOpen
        || ch === Chars.SquareBracketOpen
        || ch === Chars.RoundBracketOpen;
}

/**
 * Check if given character is allowed in element name
 */
function isElementName(ch: number) {
    return isAlphaNumericWord(ch)
        || isUmlaut(ch)
        || ch === Chars.Dash
        || ch === Chars.Colon
        || ch === Chars.Excl;
}
