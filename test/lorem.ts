import { ok, strictEqual as equal } from 'assert';
import expand from '../src';

function wordCount(str: string): number {
    return str.split(' ').length;
}

function splitLines(str: string): string[] {
    return str.split(/\n/);
}

describe('Lorem Ipsum generator', () => {
    it('single', () => {
        let output = expand('lorem');
        ok(/^Lorem,?\sipsum/.test(output));
        ok(wordCount(output) > 20);

        output = expand('lorem5');
        ok(/^Lorem,?\sipsum/.test(output));
        equal(wordCount(output), 5);

        output = expand('lorem5-10');
        ok(/^Lorem,?\sipsum/.test(output));
        ok(wordCount(output) >= 5 && wordCount(output) <= 10);

        output = expand('loremru4');
        ok(/^Далеко-далеко,?\sза,?\sсловесными/.test(output));
        equal(wordCount(output), 4);

        output = expand('p>lorem');
        ok(/^<p>Lorem,?\sipsum/.test(output));

        // https://github.com/emmetio/expand-abbreviation/issues/24
        output = expand('(p)lorem2');
        ok(/^<p><\/p>\nLorem,?\sipsum/.test(output));

        output = expand('p(lorem10)');
        ok(/^<p><\/p>\nLorem,?\sipsum/.test(output));
    });

    it('multiple', () => {
        let output = expand('lorem6*3');
        let lines = splitLines(output);
        ok(/^Lorem,?\sipsum/.test(output));
        equal(lines.length, 3);

        output = expand('lorem6*2');
        lines = splitLines(output);
        ok(/^Lorem,?\sipsum/.test(output));
        equal(lines.length, 2);

        output = expand('p*3>lorem');
        lines = splitLines(output);
        ok(/^<p>Lorem,?\sipsum/.test(lines[0]!));
        ok(!/^<p>Lorem,?\sipsum/.test(lines[1]!));

        output = expand('ul>lorem5*3', { options: { 'output.indent': '' } });
        lines = splitLines(output);
        equal(lines.length, 5);
        ok(/^<li>Lorem,?\sipsum/.test(lines[1]!));
        ok(!/^<li>Lorem,?\sipsum/.test(lines[2]!));
    });
});
