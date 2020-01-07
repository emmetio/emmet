import { isQuote, consumeQuoted } from './quotes';
import { BackwardScanner, consume, sol, consumeWhile, peek } from './reader';
import { Brackets, bracePairs } from './brackets';

const enum Chars {
    Tab = 9,
    Space = 32,
    /** `-` character */
    Dash = 45,
    /** `/` character */
    Slash = 47,
    /** `:` character */
    Colon = 58,
    /** `=` character */
    Equals = 61,
    /** `<` character */
    AngleLeft = 60,
    /** `>` character */
    AngleRight = 62,
}

/**
 * Check if given reader’s current position points at the end of HTML tag
 */
export default function isHtml(scanner: BackwardScanner): boolean {
    const start = scanner.pos;

    if (!consume(scanner, Chars.AngleRight)) {
        return false;
    }

    let ok = false;
    consume(scanner, Chars.Slash); // possibly self-closed element

    while (!sol(scanner)) {
        consumeWhile(scanner, isWhiteSpace);

        if (consumeIdent(scanner)) {
            // ate identifier: could be a tag name, boolean attribute or unquoted
            // attribute value
            if (consume(scanner, Chars.Slash)) {
                // either closing tag or invalid tag
                ok = consume(scanner, Chars.AngleLeft);
                break;
            } else if (consume(scanner, Chars.AngleLeft)) {
                // opening tag
                ok = true;
                break;
            } else if (consume(scanner, isWhiteSpace)) {
                // boolean attribute
                continue;
            } else if (consume(scanner, Chars.Equals)) {
                // simple unquoted value or invalid attribute
                if (consumeIdent(scanner)) {
                    continue;
                }
                break;
            } else if (consumeAttributeWithUnquotedValue(scanner)) {
                // identifier was a part of unquoted value
                ok = true;
                break;
            }

            // invalid tag
            break;
        }

        if (consumeAttribute(scanner)) {
            continue;
        }

        break;
    }

    scanner.pos = start;
    return ok;
}

/**
 * Consumes HTML attribute from given string.
 * @return `true` if attribute was consumed.
 */
function consumeAttribute(scanner: BackwardScanner): boolean {
    return consumeAttributeWithQuotedValue(scanner) || consumeAttributeWithUnquotedValue(scanner);
}

function consumeAttributeWithQuotedValue(scanner: BackwardScanner): boolean {
    const start = scanner.pos;
    if (consumeQuoted(scanner) && consume(scanner, Chars.Equals) && consumeIdent(scanner)) {
        return true;
    }

    scanner.pos = start;
    return false;
}

function consumeAttributeWithUnquotedValue(scanner: BackwardScanner): boolean {
    const start = scanner.pos;
    const stack: Brackets[] = [];
    while (!sol(scanner)) {
        const ch = peek(scanner);
        if (isCloseBracket(ch)) {
            stack.push(ch);
        } else if (isOpenBracket(ch)) {
            if (stack.pop() !== bracePairs[ch]) {
                // Unexpected open bracket
                break;
            }
        } else if (!isUnquotedValue(ch)) {
            break;
        }
        scanner.pos--;
    }

    if (start !== scanner.pos && consume(scanner, Chars.Equals) && consumeIdent(scanner)) {
        return true;
    }

    scanner.pos = start;
    return false;
}

/**
 * Consumes HTML identifier from stream
 */
function consumeIdent(scanner: BackwardScanner): boolean {
    return consumeWhile(scanner, isIdent);
}

/**
 * Check if given character code belongs to HTML identifier
 */
function isIdent(ch: number): boolean {
    return ch === Chars.Colon || ch === Chars.Dash || isAlpha(ch) || isNumber(ch);
}

/**
 * Check if given character code is alpha code (letter though A to Z)
 */
function isAlpha(ch: number): boolean {
    ch &= ~32; // quick hack to convert any char code to uppercase char code
    return ch >= 65 && ch <= 90; // A-Z
}

/**
 * Check if given code is a number
 */
function isNumber(ch: number): boolean {
    return ch > 47 && ch < 58;
}

/**
 * Check if given code is a whitespace
 */
function isWhiteSpace(ch: number): boolean {
    return ch === Chars.Space || ch === Chars.Tab;
}

/**
 * Check if given code may belong to unquoted attribute value
 */
function isUnquotedValue(ch: number): boolean {
    return !isNaN(ch) && ch !== Chars.Equals && !isWhiteSpace(ch) && !isQuote(ch);
}

function isOpenBracket(ch: number): boolean {
    return ch === Brackets.CurlyL || ch === Brackets.RoundL || ch === Brackets.SquareL;
}

function isCloseBracket(ch: number): boolean {
    return ch === Brackets.CurlyR || ch === Brackets.RoundR || ch === Brackets.SquareR;
}
