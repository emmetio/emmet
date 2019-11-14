export type TemplateToken = string | TemplatePlaceholder;
export interface TemplatePlaceholder {
    before: string;
    after: string;
    name: string;
}

interface TokenScanner {
    text: string;
    pos: number;
}

const enum TemplateChars {
    /** `[` character */
    Start = 91,

    /** `]` character */
    End = 93,

    /* `_` character */
    Underscore = 95,

    /* `-` character */
    Dash = 45,
}

/**
 * Splits given string into template tokens.
 * Template is a string which contains placeholders which are uppercase names
 * between `[` and `]`, for example: `[PLACEHOLDER]`.
 * Unlike other templates, a placeholder may contain extra characters before and
 * after name: `[%PLACEHOLDER.]`. If data for `PLACEHOLDER` is defined, it will
 * be outputted with with these extra character, otherwise will be completely omitted.
 */
export default function template(text: string): TemplateToken[] {
    const tokens: TemplateToken[] = [];
    const scanner: TokenScanner = { pos: 0, text };
    let placeholder: TemplatePlaceholder | undefined;
    let offset = scanner.pos;
    let pos = scanner.pos;

    while (scanner.pos < scanner.text.length) {
        pos = scanner.pos;
        if (placeholder = consumePlaceholder(scanner)) {
            if (offset !== scanner.pos) {
                tokens.push(text.slice(offset, pos));
            }
            tokens.push(placeholder);
            offset = scanner.pos;
        } else {
            scanner.pos++;
        }
    }

    if (offset !== scanner.pos) {
        tokens.push(text.slice(offset));
    }

    return tokens;
}

/**
 * Consumes placeholder like `[#ID]` from given scanner
 */
function consumePlaceholder(scanner: TokenScanner): TemplatePlaceholder | undefined {
    if (peek(scanner) === TemplateChars.Start) {
        const start = ++scanner.pos;
        let namePos = start;
        let afterPos = start;
        let stack = 1;

        while (scanner.pos < scanner.text.length) {
            const code = peek(scanner);
            if (isTokenStart(code)) {
                namePos = scanner.pos;
                while (isToken(peek(scanner))) {
                    scanner.pos++;
                }
                afterPos = scanner.pos;
            } else {
                if (code === TemplateChars.Start) {
                    stack++;
                } else if (code === TemplateChars.End) {
                    if (--stack === 0) {
                        return {
                            before: scanner.text.slice(start, namePos),
                            after: scanner.text.slice(afterPos, scanner.pos++),
                            name: scanner.text.slice(namePos, afterPos)
                        };
                    }
                }

                scanner.pos++;
            }
        }
    }
}

function peek(scanner: TokenScanner, pos = scanner.pos): number {
    return scanner.text.charCodeAt(pos);
}

function isTokenStart(code: number): boolean {
    return code >= 65 && code <= 90; // A-Z
}

function isToken(code: number): boolean {
    return isTokenStart(code)
        || (code > 47 && code < 58) /* 0-9 */
        || code === TemplateChars.Underscore
        || code === TemplateChars.Dash;
}
