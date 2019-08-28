import { BackwardScanner, previous, sol, peek } from './reader';

const enum Chars {
    SingleQuote = 39,
    DoubleQuote = 34,
    Escape = 92
}

/**
 * Check if given character code is a quote
 */
export function isQuote(c?: number) {
    return c === Chars.SingleQuote || c === Chars.DoubleQuote;
}

/**
 * Consumes quoted value, if possible
 * @return Returns `true` is value was consumed
 */
export function consumeQuoted(scanner: BackwardScanner): boolean {
    const start = scanner.pos;
    const quote = previous(scanner);

    if (isQuote(quote)) {
        while (!sol(scanner)) {
            if (previous(scanner) === quote && peek(scanner) !== Chars.Escape) {
                return true;
            }
        }
    }

    scanner.pos = start;
    return false;
}
