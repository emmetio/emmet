import Scanner from '@emmetio/scanner';
import { isAlphaNumericWord, isAlphaWord } from '@emmetio/scanner/utils';
import { CSSKeyword } from './ast';

const enum Chars {
    Dollar = 36, // $
    Dash = 45, // -
    At = 64, // @
}

/**
 * Consumes a keyword: either a variable (a word that starts with $ or @) or CSS
 * keyword or shorthand
 * @param short Use short notation for consuming value.
 * The difference between “short” and “full” notation is that first one uses
 * alpha characters only and used for extracting keywords from abbreviation,
 * while “full” notation also supports numbers and dashes
 */
export default function consumeKeyword(stream: Scanner, short?: boolean): CSSKeyword | undefined {
    const start = stream.start = stream.pos;

    if (stream.eat(Chars.Dollar) || stream.eat(Chars.At)) {
        // SCSS or LESS variable
        stream.eatWhile(isKeyword);
    } else if (short) {
        stream.eatWhile(isAlphaWord);
    } else {
        stream.eatWhile(isKeyword);
    }

    if (stream.start !== stream.pos) {
        return {
            type: 'CSSKeyword',
            value: stream.current(),
            start,
            end: stream.pos
        };
    }
}

function isKeyword(code: number): boolean {
    return isAlphaNumericWord(code) || code === Chars.Dash;
}
