import { SyntaxType } from '../config';
import backwardScanner, { sol, peek, BackwardScanner, consume } from './reader';
import isAtHTMLTag from './is-html';
import { isQuote } from './quotes';
import { Brackets, bracePairs } from './brackets';

export interface ExtractOptions {
    /**
     * Allow parser to look ahead of `pos` index for searching of missing
     * abbreviation parts. Most editors automatically inserts closing braces for
     * `[`, `{` and `(`, which will most likely be right after current caret position.
     * So in order to properly expand abbreviation, user must explicitly move
     * caret right after auto-inserted braces. With this option enabled, parser
     * will search for closing braces right after `pos`. Default is `true`
     */
    lookAhead: boolean;

    /**
     * Type of context syntax of expanded abbreviation.
     * In 'stylesheet' syntax, brackets `[]` and `{}` are not supported thus
     * not extracted.
     */
    type: SyntaxType;

    /**
     * A string that should precede abbreviation in order to make it successfully
     * extracted. If given, the abbreviation will be extracted from the nearest
     * `prefix` occurrence.
     */
    prefix: string;
}

export interface ExtractedAbbreviation {
    /** Extracted abbreviation */
    abbreviation: string;

    /** Location of abbreviation in input string */
    location: number;

    /** Start location of matched abbreviation, including prefix */
    start: number;

    /** End location of extracted abbreviation */
    end: number;
}

const code = (ch: string) => ch.charCodeAt(0);
const specialChars = '#.*:$-_!@%^+>/'.split('').map(code);

const defaultOptions: ExtractOptions = {
    type: 'markup',
    lookAhead: true,
    prefix: ''
};

/**
 * Extracts Emmet abbreviation from given string.
 * The goal of this module is to extract abbreviation from current editor’s line,
 * e.g. like this: `<span>.foo[title=bar|]</span>` -> `.foo[title=bar]`, where
 * `|` is a current caret position.
 * @param line A text line where abbreviation should be expanded
 * @param pos Caret position in line. If not given, uses end of line
 * @param options Extracting options
 */
export default function extractAbbreviation(line: string, pos: number = line.length, options: Partial<ExtractOptions> = {}): ExtractedAbbreviation | undefined {
    // make sure `pos` is within line range
    const opt: ExtractOptions = { ...defaultOptions, ...options };
    pos = Math.min(line.length, Math.max(0, pos == null ? line.length : pos));

    if (opt.lookAhead) {
        pos = offsetPastAutoClosed(line, pos, opt);
    }

    let ch: number;
    const start = getStartOffset(line, pos, opt.prefix || '');
    if (start === -1) {
        return void 0;
    }

    const scanner = backwardScanner(line, start);
    scanner.pos = pos;
    const stack: number[] = [];

    while (!sol(scanner)) {
        ch = peek(scanner);

        if (stack.includes(Brackets.CurlyR)) {
            if (ch === Brackets.CurlyR) {
                stack.push(ch);
                scanner.pos--;
                continue;
            }

            if (ch !== Brackets.CurlyL) {
                scanner.pos--;
                continue;
            }
        }

        if (isCloseBrace(ch, opt.type)) {
            stack.push(ch);
        } else if (isOpenBrace(ch, opt.type)) {
            if (stack.pop() !== bracePairs[ch]) {
                // unexpected brace
                break;
            }
        } else if (stack.includes(Brackets.SquareR) || stack.includes(Brackets.CurlyR)) {
            // respect all characters inside attribute sets or text nodes
            scanner.pos--;
            continue;
        } else if (isAtHTMLTag(scanner) || !isAbbreviation(ch)) {
            break;
        }

        scanner.pos--;
    }

    if (!stack.length && scanner.pos !== pos) {
        // Found something, remove some invalid symbols from the
        // beginning and return abbreviation
        const abbreviation = line.slice(scanner.pos, pos).replace(/^[*+>^]+/, '');
        return {
            abbreviation,
            location: pos - abbreviation.length,
            start: options.prefix
                ? start - options.prefix.length
                : pos - abbreviation.length,
            end: pos
        };
    }
}

/**
 * Returns new `line` index which is right after characters beyound `pos` that
 * editor will likely automatically close, e.g. }, ], and quotes
 */
function offsetPastAutoClosed(line: string, pos: number, options: ExtractOptions): number {
    // closing quote is allowed only as a next character
    if (isQuote(line.charCodeAt(pos))) {
        pos++;
    }

    // offset pointer until non-autoclosed character is found
    while (isCloseBrace(line.charCodeAt(pos), options.type)) {
        pos++;
    }

    return pos;
}

/**
 * Returns start offset (left limit) in `line` where we should stop looking for
 * abbreviation: it’s nearest to `pos` location of `prefix` token
 */
function getStartOffset(line: string, pos: number, prefix: string): number {
    if (!prefix) {
        return 0;
    }

    const scanner = backwardScanner(line);
    const compiledPrefix = prefix.split('').map(code);
    scanner.pos = pos;
    let result: number;

    while (!sol(scanner)) {
        if (consumePair(scanner, Brackets.SquareR, Brackets.SquareL) || consumePair(scanner, Brackets.CurlyR, Brackets.CurlyL)) {
            continue;
        }

        result = scanner.pos;
        if (consumeArray(scanner, compiledPrefix)) {
            return result;
        }

        scanner.pos--;
    }

    return -1;
}

/**
 * Consumes full character pair, if possible
 */
function consumePair(scanner: BackwardScanner, close: number, open: number): boolean {
    const start = scanner.pos;
    if (consume(scanner, close)) {
        while (!sol(scanner)) {
            if (consume(scanner, open)) {
                return true;
            }

            scanner.pos--;
        }
    }

    scanner.pos = start;
    return false;
}

/**
 * Consumes all character codes from given array, right-to-left, if possible
 */
function consumeArray(scanner: BackwardScanner, arr: number[]) {
    const start = scanner.pos;
    let consumed = false;

    for (let i = arr.length - 1; i >= 0 && !sol(scanner); i--) {
        if (!consume(scanner, arr[i])) {
            break;
        }

        consumed = i === 0;
    }

    if (!consumed) {
        scanner.pos = start;
    }

    return consumed;
}

function isAbbreviation(ch: number) {
    return (ch > 64 && ch < 91)   // uppercase letter
        || (ch > 96 && ch < 123)  // lowercase letter
        || (ch > 47 && ch < 58)   // number
        || specialChars.includes(ch); // special character
}

function isOpenBrace(ch: number, syntax: SyntaxType) {
    return ch === Brackets.RoundL || (syntax === 'markup' && (ch === Brackets.SquareL || ch === Brackets.CurlyL));
}

function isCloseBrace(ch: number, syntax: SyntaxType) {
    return ch === Brackets.RoundR || (syntax === 'markup' && (ch === Brackets.SquareR || ch === Brackets.CurlyR));
}
