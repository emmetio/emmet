import { describe, it } from 'node:test';
import { strictEqual as equal } from 'node:assert';
import { isInsideCommentOrString } from '../src/syntax-context';
import type { SyntaxFamily } from '../src/types';

/** Checks the position marked with `|` in given line */
function at(line: string, family: SyntaxFamily): boolean {
    const position = line.indexOf('|');
    return isInsideCommentOrString(line.replace('|', ''), position, family);
}

describe('Syntax Context', () => {
    describe('Markup', () => {
        it('detects comments', () => {
            equal(at('<!-- ul>li*3|', 'html'), true);
            equal(at('<div><!-- x|', 'html'), true);
            equal(at('<!-- x --> ul>li*3|', 'html'), false);
            equal(at('<!-- x --> a <!-- y|', 'html'), true);
        });

        it('detects attribute values', () => {
            equal(at('<div class="ul>li*3|', 'html'), true);
            equal(at('<div class="a">ul>li*3|', 'html'), false);
            equal(at('<div data-a=\'x\' class="y|', 'html'), true);
        });

        it('ignores quotes in text content', () => {
            // Apostrophes in prose are not string delimiters
            equal(at('<p>Don\'t stop ul>li*3|', 'html'), false);
            equal(at('<p>It\'s a "quote" ul>li*3|', 'html'), false);
        });
    });

    describe('Stylesheet', () => {
        it('detects comments', () => {
            equal(at('/* m10|', 'css'), true);
            equal(at('/* x */ m10|', 'css'), false);
            equal(at('a { /* x */ m10|', 'css'), false);
        });

        it('detects strings', () => {
            equal(at('content: "m10|', 'css'), true);
            equal(at('content: "x"; m10|', 'css'), false);
        });
    });

    describe('Script', () => {
        it('detects line comments', () => {
            equal(at('// ul>li*3|', 'js'), true);
            equal(at('const a = 1; // x|', 'js'), true);
        });

        it('detects block comments', () => {
            equal(at('/* ul>li*3|', 'js'), true);
            equal(at('/* x */ ul>li*3|', 'js'), false);
        });

        it('detects strings and template literals', () => {
            equal(at('const a = "ul>li*3|', 'js'), true);
            equal(at('const a = `ul>li*3|', 'js'), true);
            equal(at('const a = "x"; ul>li*3|', 'js'), false);
            equal(at('const a = "say \\"hi\\""; ul>li*3|', 'js'), false);
        });

        it('does not treat a URL as a comment', () => {
            equal(at('const url = "http://example.com"; ul>li*3|', 'js'), false);
            equal(at('<a href="http://example.com">ul>li*3|', 'html'), false);
        });
    });
});
