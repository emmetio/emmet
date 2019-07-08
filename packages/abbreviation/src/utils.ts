import { EMString, EMNode, EMTokenGroup } from './ast';
import Scanner from '@emmetio/scanner';

export const enum Chars {
    /** `{` character */
    ExpressionStart = 123,

    /** `}` character */
    ExpressionEnd = 125,

    /** `\\` character */
    Escape = 92,

    /** `=` character */
    Equals = 61,

    /** `[` character */
    AttrOpen = 91,

    /** `]` character */
    AttrClose = 93,

    /** `*` character */
    Repeater = 42,

    /** `#` character */
    Hash = 35,

    /** `$` character */
    Dollar = 36,

    /** `-` character */
    Dash = 45,

    /** `.` character */
    Dot = 46,

    /** `/` character */
    Slash = 47,

    /** `:` character */
    Colon = 58,

    /** `!` character */
    Excl = 33,

    /** `@` character */
    At = 64,

    /** `_` character */
    Underscore = 95,

    /** `(` character */
    GroupStart = 40,

    /** `)` character */
    GroupEnd = 41,

    /** `+` character */
    Sibling = 43,

    /** `>` character */
    Child = 62,

    /** `^` character */
    Climb = 94,
}

/**
 * If consumes escape character, sets current stream range to escaped value
 */
export function escaped(scanner: Scanner): boolean {
    if (scanner.eat(Chars.Escape)) {
        if (scanner.eof()) {
            scanner.start = scanner.pos - 1;
        } else {
            scanner.start = scanner.pos++;
        }

        return true;
    }

    return false;
}

/**
 * AST string token factory
 */
export function stringToken(value: string, start?: number, end?: number): EMString {
    return { type: 'EMString', value, start, end };
}

interface TokenGroupAccumulator<T extends EMNode = EMNode> {
    tokens: T[];
    offset: number;
    str: string;
}

export function tokenAccumulator<T extends EMNode>(offset: number): TokenGroupAccumulator<T> {
    return { offset, tokens: [], str: '' };
}

export function pushString(acc: TokenGroupAccumulator, nextOffset: number) {
    if (acc.str) {
        acc.tokens.push(stringToken(acc.str, acc.offset, nextOffset));
        acc.str = '';
    }
    acc.offset = nextOffset;
}

export function pushToken<T extends EMNode>(acc: TokenGroupAccumulator, token: T) {
    pushString(acc, token.start!);
    acc.tokens.push(token);
    acc.offset = token.end!;
}

export function createGroup<T extends EMNode>(scanner: Scanner, tokens: T[], before?: string, after?: string): EMTokenGroup<T> {
    return {
        type: 'EMTokenGroup',
        tokens,
        before,
        after,
        raw: scanner.current(),
        start: scanner.start,
        end: scanner.pos
    };
}
