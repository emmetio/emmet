import Scanner, { isSpace, isQuote } from '@emmetio/scanner';
import { EMNode, EMTokenGroup } from './ast';
import { tokenAccumulator, escaped, Chars, pushString, createGroup, pushToken } from './utils';
import nextToken, { AllowedTokens } from './next-token';

export const enum AllowedChars {
    /** Allow square braces to be consumed */
    Square = 1 << 1,
    Round = 1 << 2,
    All = Square | Round,
}

type TestChar = (ch: number) => boolean;

/**
 * Consumes unquoted literal from given string
 */
export default function unquoted<T extends EMNode>(scanner: Scanner, chars: AllowedChars = 0, tokens: AllowedTokens = 0, test: TestChar = isUnquoted): EMTokenGroup<T> | undefined {
    let square = 0;
    let round = 0;
    let token: EMNode | undefined;
    const allowSquare = chars & AllowedChars.Square;
    const allowRound = chars & AllowedChars.Round;
    const start = scanner.pos;
    const acc = tokenAccumulator<T>(start);

    while (!scanner.eof()) {
        const ch = scanner.peek();
        scanner.start = scanner.pos;

        if (ch === Chars.AttrOpen) {
            // Check if square braces are allowed. If not, stop parsing
            if (allowSquare) {
                square++;
                scanner.pos++;
                acc.str += scanner.current();
            } else {
                break;
            }
        } else if (ch === Chars.AttrClose) {
            if (allowSquare && square) {
                square--;
                scanner.pos++;
                acc.str += scanner.current();
            } else {
                break;
            }
        } else if (ch === Chars.GroupStart) {
            // Check if round braces are allowed. If not, stop parsing
            if (allowRound) {
                round++;
                scanner.pos++;
                acc.str += scanner.current();
            } else {
                break;
            }
        } else if (ch === Chars.GroupEnd) {
            if (allowRound && round) {
                round--;
                scanner.pos++;
                acc.str += scanner.current();
            } else {
                break;
            }
        } else if (token = nextToken(scanner, tokens)) {
            pushToken(acc, token);
        } else if (escaped(scanner) || scanner.eat(test)) {
            acc.str += scanner.current();
        } else {
            break;
        }
    }

    if (square) {
        throw scanner.error('Expecting ]');
    }

    if (round) {
        throw scanner.error('Expecting )');
    }

    if (start !== scanner.pos) {
        pushString(acc, scanner.pos);
        scanner.start = start;
        return createGroup(scanner, acc.tokens);
    }
}

function isUnquoted(code: number): boolean {
    return !isNaN(code) && !isSpace(code) && !isQuote(code) && code !== Chars.Equals;
}
