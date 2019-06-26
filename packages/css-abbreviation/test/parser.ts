import { equal, throws } from 'assert';
import parser, { CSSFunction, CSSKeyword, CSSString, CSSNumber } from '../src/index';
import stringify from './assets/stringify';

describe('CSS Abbreviation parser', () => {
    const parse = (abbr: string) => stringify(parser(abbr));

    it('numeric units', () => {
        equal(parse('p10'), 'p: 10;');
        equal(parse('p-10'), 'p: -10;');
        equal(parse('p-10-'), 'p: -10;');
        equal(parse('p-10-20'), 'p: -10 20;');
        equal(parse('p-10--20'), 'p: -10 -20;');
        equal(parse('p-10-20--30'), 'p: -10 20 -30;');
        equal(parse('p-10p-20--30'), 'p: -10p -20 -30;');
        equal(parse('p-10%-20--30'), 'p: -10% -20 -30;');

        equal(parse('p.5'), 'p: 0.5;');
        equal(parse('p-.5'), 'p: -0.5;');
        equal(parse('p.1.2.3'), 'p: 0.1 0.2 0.3;');
        equal(parse('p.1-.2.3'), 'p: 0.1 0.2 0.3;');
        equal(parse('p.1--.2.3'), 'p: 0.1 -0.2 0.3;');

        equal(parse('10'), '10;');
        equal(parse('.1'), '0.1;');
        throws(() => parse('.foo'), /Unexpected character at 1/);
    });

    it('color', () => {
        equal(parse('c#'), 'c: #000000;');
        equal(parse('c#1'), 'c: #111111;');
        equal(parse('c#f'), 'c: #ffffff;');
        equal(parse('c#a#b#c'), 'c: #aaaaaa #bbbbbb #cccccc;');
        equal(parse('c#af'), 'c: #afafaf;');
        equal(parse('c#fc0'), 'c: #ffcc00;');
        equal(parse('c#11.5'), 'c: rgba(17, 17, 17, 0.5);');
        equal(parse('c#.99'), 'c: rgba(0, 0, 0, 0.99);');
        equal(parse('c#t'), 'c: transparent;');
    });

    it('keywords', () => {
        equal(parse('m:a'), 'm: a;');
        equal(parse('m-a'), 'm: a;');
        equal(parse('m-abc'), 'm: abc;');
        equal(parse('m-a0'), 'm: a 0;');
        equal(parse('m-a0-a'), 'm: a 0 a;');
    });

    it('arguments', () => {
        const g = parser('lg(top, "red, black", rgb(0, 0, 0) 10%)').elements[0].value![0] as CSSFunction;
        equal(g.name, 'lg');
        equal(g.arguments.length, 3);

        let arg = g.arguments[0];
        equal(arg.items.length, 1);
        equal(arg.items[0].type, 'CSSKeyword');
        equal((arg.items[0] as CSSKeyword).value, 'top');

        arg = g.arguments[1];
        equal(arg.items.length, 1);
        equal(arg.items[0].type, 'CSSString');
        equal((arg.items[0] as CSSString).value, '"red, black"');

        arg = g.arguments[2];
        equal(arg.items.length, 2);
        equal(arg.items[0].type, 'CSSFunction');

        const args = (arg.items[0] as CSSFunction).arguments;
        equal(args.length, 3);
        equal(args[0].items[0].type, 'CSSNumber');
        equal((args[0].items[0] as CSSNumber).value, 0);
    });

    it('important/exclamation', () => {
        equal(parse('!'), '!;');
        equal(parse('p!'), 'p: !;');
        equal(parse('p10!'), 'p: 10!;');
    });

    it('mixed', () => {
        equal(parse('bd1-s#fc0'), 'bd: 1 s #ffcc00;');
        equal(parse('bd#fc0-1'), 'bd: #ffcc00 1;');
        equal(parse('p0+m0'), 'p: 0;m: 0;');
        equal(parse('p0!+m0!'), 'p: 0!;m: 0!;');
    });

    it('embedded variables', () => {
        equal(parse('foo$bar'), 'foo: $bar;');
        equal(parse('foo$bar-2'), 'foo: $bar-2;');
        equal(parse('foo$bar@bam'), 'foo: $bar @bam;');
    });
});
