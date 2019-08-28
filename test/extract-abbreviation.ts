import { deepStrictEqual, strictEqual, ok } from 'assert';
import extractAbbreviation, { ExtractOptions, ExtractedAbbreviation } from '../src/extract-abbreviation';
import isAtHTMLTag from '../src/extract-abbreviation/is-html';
import scanner from '../src/extract-abbreviation/reader';
import { consumeQuoted } from '../src/extract-abbreviation/quotes';

function extract(abbr: string, options?: Partial<ExtractOptions>) {
    let caretPos: number | undefined = abbr.indexOf('|');
    if (caretPos !== -1) {
        abbr = abbr.slice(0, caretPos) + abbr.slice(caretPos + 1);
    } else {
        caretPos = void 0;
    }

    return extractAbbreviation(abbr, caretPos, options);
}

function result(abbreviation: string, location: number, start = location): ExtractedAbbreviation {
    return {
        abbreviation,
        location,
        start: start != null ? start : location,
        end: location + abbreviation.length
    };
}

describe('Extract abbreviation', () => {
    it('basic', () => {
        deepStrictEqual(extract('.bar'), result('.bar', 0));
        deepStrictEqual(extract('.foo .bar'), result('.bar', 5));
        deepStrictEqual(extract('.foo @bar'), result('@bar', 5));
        deepStrictEqual(extract('.foo img/'), result('img/', 5));
        deepStrictEqual(extract('текстdiv'), result('div', 5));
        deepStrictEqual(extract('foo div[foo="текст" bar=текст2]'), result('div[foo="текст" bar=текст2]', 4));
    });

    it('abbreviation with operators', () => {
        deepStrictEqual(extract('a foo+bar.baz'), result('foo+bar.baz', 2));
        deepStrictEqual(extract('a foo>bar+baz*3'), result('foo>bar+baz*3', 2));
    });

    it('abbreviation with attributes', () => {
        deepStrictEqual(extract('a foo[bar|]'), result('foo[bar]', 2));
        deepStrictEqual(extract('a foo[bar="baz" a b]'), result('foo[bar="baz" a b]', 2));
        deepStrictEqual(extract('foo bar[a|] baz'), result('bar[a]', 4));
    });

    it('tag test', () => {
        deepStrictEqual(extract('<foo>bar[a b="c"]>baz'), result('bar[a b="c"]>baz', 5));
        deepStrictEqual(extract('foo>bar'), result('foo>bar', 0));
        deepStrictEqual(extract('<foo>bar'), result('bar', 5));
        deepStrictEqual(extract('<foo>bar[a="d" b="c"]>baz'), result('bar[a="d" b="c"]>baz', 5));
    });

    it('stylesheet abbreviation', () => {
        deepStrictEqual(extract('foo{bar|}'), result('foo{bar}', 0));
        deepStrictEqual(extract('foo{bar|}', { type: 'stylesheet' }), result('bar', 4));
    });

    it('prefixed extract', () => {
        deepStrictEqual(extract('<foo>bar[a b="c"]>baz'), result('bar[a b="c"]>baz', 5));
        deepStrictEqual(extract('<foo>bar[a b="c"]>baz', { prefix: '<' }), result('foo>bar[a b="c"]>baz', 1, 0));
        deepStrictEqual(extract('<foo>bar[a b="<"]>baz', { prefix: '<' }), result('foo>bar[a b="<"]>baz', 1, 0));
        deepStrictEqual(extract('<foo>bar{<}>baz', { prefix: '<' }), result('foo>bar{<}>baz', 1, 0));

        // Multiple prefix characters
        deepStrictEqual(extract('foo>>>bar[a b="c"]>baz', { prefix: '>>>' }), result('bar[a b="c"]>baz', 6, 3));

        // Absent prefix
        strictEqual(extract('<foo>bar[a b="c"]>baz', { prefix: '&&' }), void 0);
    });

    it('HTML test', () => {
        const html = (str: string) => isAtHTMLTag(scanner(str));

        // simple tag
        ok(html('<div>'));
        ok(html('<div/>'));
        ok(html('<div />'));
        ok(html('</div>'));

        // tag with attributes
        ok(html('<div foo="bar">'));
        ok(html('<div foo=bar>'));
        ok(html('<div foo>'));
        ok(html('<div a="b" c=d>'));
        ok(html('<div a=b c=d>'));
        ok(html('<div a=^b$ c=d>'));
        ok(html('<div a=b c=^%d]$>'));
        ok(html('<div title=привет>'));
        ok(html('<div title=привет123>'));
        ok(html('<foo-bar>'));

        // invalid tags
        ok(!html('div>'));
        ok(!html('<div'));
        ok(!html('<div привет>'));
        ok(!html('<div =bar>'));
        ok(!html('<div foo=>'));
        ok(!html('[a=b c=d]>'));
        ok(!html('div[a=b c=d]>'));
    });

    it('consume quotes', () => {
        let s = scanner(' "foo"');
        ok(consumeQuoted(s));
        strictEqual(s.pos, 1);

        s = scanner('"foo"');
        ok(consumeQuoted(s));
        strictEqual(s.pos, 0);

        s = scanner('""');
        ok(consumeQuoted(s));
        strictEqual(s.pos, 0);

        s = scanner('"a\\\"b"');
        ok(consumeQuoted(s));
        strictEqual(s.pos, 0);

        // don’t eat anything
        s = scanner('foo');
        ok(!consumeQuoted(s));
        strictEqual(s.pos, 3);
    });
});
