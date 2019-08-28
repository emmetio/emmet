type Match = ((code: number) => boolean) | number;

export interface BackwardScanner {
    /** Text to scan */
    text: string;

    /** Left bound till given text must be scanned */
    start: number;

    /** Current scanner position */
    pos: number;
}

/**
 * Creates structure for scanning given string in backward direction
 */
export default function backwardScanner(text: string, start = 0): BackwardScanner {
    return { text, start, pos: text.length };
}

/**
 * Check if given scanner position is at start of scanned text
 */
export function sol(scanner: BackwardScanner) {
    return scanner.pos === scanner.start;
}

/**
 * “Peeks” character code an current scanner location without advancing it
 */
export function peek(scanner: BackwardScanner, offset = 0) {
    return scanner.text.charCodeAt(scanner.pos - 1 + offset);
}

/**
 * Returns current character code and moves character location one symbol back
 */
export function previous(scanner: BackwardScanner) {
    if (!sol(scanner)) {
        return scanner.text.charCodeAt(--scanner.pos);
    }
}

/**
 * Consumes current character code if it matches given `match` code or function
 */
export function consume(scanner: BackwardScanner, match: Match): boolean {
    if (sol(scanner)) {
        return false;
    }

    const ok = typeof match === 'function'
        ? match(peek(scanner))
        : match === peek(scanner);

    if (ok) {
        scanner.pos--;
    }

    return !!ok;
}

export function consumeWhile(scanner: BackwardScanner, match: Match): boolean {
    const start = scanner.pos;
    while (consume(scanner, match)) {
        // empty
    }
    return scanner.pos < start;
}
