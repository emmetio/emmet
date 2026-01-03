import { SyntaxFamily } from './types';

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
    const [blockStart, blockEnd] = family === 'html' ? ['<!--', '-->'] : ['/*', '*/'];

    // In markup, quotes only delimit strings inside a tag: an apostrophe in
    // plain text (“don’t”) starts nothing
    let insideTag = family !== 'html';
    let insideBlockComment = false;
    let quote = '';
    let i = 0;

    while (i < position) {
        const char = line[i]!;

        if (insideBlockComment) {
            if (line.startsWith(blockEnd, i)) {
                insideBlockComment = false;
                i += blockEnd.length;
            } else {
                i++;
            }
            continue;
        }

        if (quote) {
            if (char === '\\') {
                i += 2;
                continue;
            }
            if (char === quote) {
                quote = '';
            }
            i++;
            continue;
        }

        if (line.startsWith(blockStart, i)) {
            insideBlockComment = true;
            i += blockStart.length;
            continue;
        }

        // A line comment runs to the end of the line, so the position is inside it
        if (family === 'js' && line.startsWith('//', i)) {
            return true;
        }

        if (family === 'html') {
            if (char === '<') {
                insideTag = true;
            } else if (char === '>') {
                insideTag = false;
            }
        }

        if (insideTag && (char === '"' || char === '\'' || (family === 'js' && char === '`'))) {
            quote = char;
        }

        i++;
    }

    return insideBlockComment || quote !== '';
}
