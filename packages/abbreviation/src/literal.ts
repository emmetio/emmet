import Scanner from '@emmetio/scanner';
import { eatQuoted, isQuote, isSpace } from '@emmetio/scanner/utils';
import { EMLiteral } from './ast';
import { Chars } from './utils';

/**
 * Consumes string literal from given stream. A string literal could be either
 * quoted string, unquoted string or expression value, e.g. `{...}`
 */
export default function consumeLiteral(stream: Scanner): EMLiteral | undefined {
    let value: string | undefined;
    let before = '';
    let after = '';

    if (quoted(stream) || expression(stream)) {
        const text = stream.current();
        before = text[0];
        after = text[text.length - 1];
        value = text.slice(1, -1);
    } else if (unquoted(stream)) {
        value = stream.current();
    }

    if (value != null) {
        return {
            type: 'EMLiteral',
            value,
            before,
            after,
            start: stream.start,
            end: stream.pos
        };
    }
}

/**
 * Consumes text node `{...}` from stream
 * @return Returns consumed text node or `undefined` if there’s no text at starting position
 */
export function expression(stream: Scanner): boolean {
    const start = stream.pos;

    if (stream.eat(Chars.ExpressionStart)) {
        let stack = 1;
        let ch: number | undefined;

        while (!stream.eof()) {
            ch = stream.next();
            if (ch === Chars.ExpressionStart) {
                stack++;
            } else if (ch === Chars.ExpressionEnd) {
                stack--;
                if (!stack) {
                    stream.start = start;
                    return true;
                }
            } else if (ch === Chars.Escape) {
                stream.next();
            }
        }

        // If we’re here then paired character can’t be consumed
        stream.pos = start;
        throw stream.error(`Unable to find closing ${String.fromCharCode(Chars.ExpressionEnd)} for text start`);
    }

    return false;
}

/**
 * Consumes quoted string from given stream
 */
export function quoted(stream: Scanner): boolean {
    return eatQuoted(stream, { throws: true });
}

/**
 * Consumes unquoted string from given stream
 */
export function unquoted(stream: Scanner): boolean {
    const start = stream.pos;
    if (stream.eatWhile(isUnquoted)) {
        stream.start = start;
        return true;
    }

    return false;
}

function isUnquoted(code: number): boolean {
    return !isNaN(code) && !isSpace(code) && !isQuote(code)
        && code !== Chars.AttrOpen && code !== Chars.AttrClose && code !== Chars.Equals;
}
