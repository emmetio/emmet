import { SyntaxFamily } from './types';

const enum Char {
    Excl = 33,        // !
    Quote = 34,       // "
    Apos = 39,        // '
    Star = 42,        // *
    Dash = 45,        // -
    Slash = 47,       // /
    LT = 60,          // <
    GT = 62,          // >
    Backslash = 92,   // \
    Backtick = 96     // `
}

/**
 * Tells whether given position of a line falls inside a comment or a string.
 *
 * The line is scanned from its start, so quotes and comment tokens are read in
 * order instead of being merely counted. It’s a single-line approximation:
 * comments and strings spanning multiple lines are not tracked.
 */
export function isInsideCommentOrString(
    line: string,
    position: number,
    family: SyntaxFamily
): boolean {
    const isMarkup = family === 'html';
    const isScript = family === 'js';

    // In markup, quotes only delimit strings inside a tag: an apostrophe in
    // plain text (“don’t”) starts nothing
    let insideTag = !isMarkup;
    let insideBlockComment = false;
    let quote = 0;
    let i = 0;

    while (i < position) {
        const char = line.charCodeAt(i);

        if (insideBlockComment) {
            if (isMarkup) {
                if (char === Char.Dash
                    && line.charCodeAt(i + 1) === Char.Dash
                    && line.charCodeAt(i + 2) === Char.GT) {
                    insideBlockComment = false;
                    i += 3;
                    continue;
                }
            } else if (char === Char.Star && line.charCodeAt(i + 1) === Char.Slash) {
                insideBlockComment = false;
                i += 2;
                continue;
            }

            i++;
            continue;
        }

        if (quote) {
            if (char === Char.Backslash) {
                i += 2;
                continue;
            }
            if (char === quote) {
                quote = 0;
            }
            i++;
            continue;
        }

        if (isMarkup) {
            if (char === Char.LT) {
                if (line.charCodeAt(i + 1) === Char.Excl
                    && line.charCodeAt(i + 2) === Char.Dash
                    && line.charCodeAt(i + 3) === Char.Dash) {
                    insideBlockComment = true;
                    i += 4;
                    continue;
                }

                insideTag = true;
                i++;
                continue;
            }

            if (char === Char.GT) {
                insideTag = false;
                i++;
                continue;
            }
        } else if (char === Char.Slash) {
            const next = line.charCodeAt(i + 1);

            if (next === Char.Star) {
                insideBlockComment = true;
                i += 2;
                continue;
            }

            // A line comment runs to the end of the line, so the position is inside it
            if (next === Char.Slash && isScript) {
                return true;
            }
        }

        if (insideTag
            && (char === Char.Quote || char === Char.Apos || (isScript && char === Char.Backtick))) {
            quote = char;
        }

        i++;
    }

    return insideBlockComment || quote !== 0;
}
