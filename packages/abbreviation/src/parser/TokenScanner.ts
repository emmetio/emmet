import type { AllTokens } from '../tokenizer';

export interface TokenScanner {
    tokens: AllTokens[];
    start: number;
    pos: number;
    size: number;
}

type TestFn = (token?: AllTokens) => boolean;

export default function tokenScanner(tokens: AllTokens[]): TokenScanner {
    return {
        tokens,
        start: 0,
        pos: 0,
        size: tokens.length
    };
}

export function peek(scanner: TokenScanner): AllTokens | undefined {
    return scanner.tokens[scanner.pos];
}

export function next(scanner: TokenScanner): AllTokens | undefined {
    return scanner.tokens[scanner.pos++];
}

export function slice(scanner: TokenScanner, from = scanner.start, to = scanner.pos): AllTokens[] {
    return scanner.tokens.slice(from, to);
}

export function readable(scanner: TokenScanner): boolean {
    return scanner.pos < scanner.size;
}

export function consume(scanner: TokenScanner, test: TestFn): boolean {
    const token = peek(scanner);
    if (token && test(token)) {
        scanner.pos++;
        return true;
    }

    return false;
}

export function error(scanner: TokenScanner, message: string, token = peek(scanner)) {
    if (token && token.start != null) {
        message += ` at ${token.start}`;
    }

    const err = new Error(message);
    err['pos'] = token && token.start;

    return err;
}

export function consumeWhile(scanner: TokenScanner, test: TestFn): boolean {
    const start = scanner.pos;
    while (consume(scanner, test)) { /* */ }
    return scanner.pos !== start;
}
