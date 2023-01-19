import type Scanner from './scanner.js';

interface QuotedOptions {
    /** A character code of quote-escape symbol */
    escape?: number;

    /** Throw error if quotes string can’t be properly consumed */
    throws?: boolean;
}

const defaultQuotedOptions: QuotedOptions = {
    escape: 92,   // \ character
    throws: false
};

/**
 * Check if given code is a number
 */
export function isNumber(code: number): boolean {
    return code > 47 && code < 58;
}

/**
 * Check if given character code is alpha code (letter through A to Z)
 */
export function isAlpha(code: number, from?: number, to?: number): boolean {
    from = from || 65; // A
    to = to || 90; // Z
    code &= ~32; // quick hack to convert any char code to uppercase char code

    return code >= from && code <= to;
}

/**
 * Check if given character code is alpha-numeric (letter through A to Z or number)
 */
export function isAlphaNumeric(code: number): boolean {
    return isNumber(code) || isAlpha(code);
}

export function isAlphaNumericWord(code: number): boolean {
    return isNumber(code) || isAlphaWord(code);
}

export function isAlphaWord(code: number): boolean {
    return code === 95 /* _ */ || isAlpha(code);
}

/**
 * Check if given character code is a white-space character: a space character
 * or line breaks
 */
export function isWhiteSpace(code: number) {
    return code === 32   /* space */
        || code === 9    /* tab */
        || code === 160; /* non-breaking space */
}

/**
 * Check if given character code is a space character
 */
export function isSpace(code: number): boolean {
    return isWhiteSpace(code)
        || code === 10  /* LF */
        || code === 13; /* CR */
}

/**
 * Consumes 'single' or "double"-quoted string from given string, if possible
 * @return `true` if quoted string was consumed. The contents of quoted string
 * will be available as `stream.current()`
 */
export function eatQuoted(stream: Scanner, options?: QuotedOptions): boolean {
    options = { ...defaultQuotedOptions, ...options };
    const start = stream.pos;
    const quote = stream.peek();

    if (stream.eat(isQuote)) {
        while (!stream.eof()) {
            switch (stream.next()) {
                case quote:
                    stream.start = start;
                    return true;

                case options.escape:
                    stream.next();
                    break;
            }
        }

        // If we’re here then stream wasn’t properly consumed.
        // Revert stream and decide what to do
        stream.pos = start;

        if (options.throws) {
            throw stream.error('Unable to consume quoted string');
        }
    }

    return false;
}

/**
 * Check if given character code is a quote character
 */
export function isQuote(code: number): boolean {
    return code === 39 /* ' */ || code === 34 /* " */;
}

/**
 * Eats paired characters substring, for example `(foo)` or `[bar]`
 * @param open Character code of pair opening
 * @param close Character code of pair closing
 * @return Returns `true` if character pair was successfully consumed, it’s
 * content will be available as `stream.current()`
 */
export function eatPair(stream: Scanner, open: number, close: number, options?: QuotedOptions): boolean {
    options = { ...defaultQuotedOptions, ...options };
    const start = stream.pos;

    if (stream.eat(open)) {
        let stack = 1;
        let ch: number;

        while (!stream.eof()) {
            if (eatQuoted(stream, options)) {
                continue;
            }

            ch = stream.next()!;
            if (ch === open) {
                stack++;
            } else if (ch === close) {
                stack--;
                if (!stack) {
                    stream.start = start;
                    return true;
                }
            } else if (ch === options.escape) {
                stream.next();
            }
        }

        // If we’re here then paired character can’t be consumed
        stream.pos = start;

        if (options.throws) {
            throw stream.error(`Unable to find matching pair for ${String.fromCharCode(open)}`);
        }
    }

    return false;
}
