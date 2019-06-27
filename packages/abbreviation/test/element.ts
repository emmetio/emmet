import { equal, throws } from 'assert';
import Scanner from '@emmetio/scanner';
import consumeElement from '../src/element';
import stringify from './assets/stringify';

describe('Element node', () => {
    const parse = (str: string) => stringify(consumeElement(new Scanner(str)));

    it('simple', () => {
        equal(parse('div'), '<div></div>');
        equal(parse('div.foo'), '<div class="foo"></div>');
        equal(parse('div#foo'), '<div id="foo"></div>');
        equal(parse('div#foo.bar'), '<div id="foo" class="bar"></div>');
        equal(parse('div.foo#bar'), '<div class="foo" id="bar"></div>');
        equal(parse('div.foo.bar.baz'), '<div class="foo" class="bar" class="baz"></div>');
        equal(parse('.foo'), '<? class="foo"></?>');
        equal(parse('#foo'), '<? id="foo"></?>');
        equal(parse('.foo_bar'), '<? class="foo_bar"></?>');
        equal(parse('#foo.bar'), '<? id="foo" class="bar"></?>');

        equal(parse('.'), '<? class=""></?>');
        equal(parse('#'), '<? id=""></?>');
        equal(parse('#.'), '<? id="" class=""></?>');
        equal(parse('.#.'), '<? class="" id="" class=""></?>');
        equal(parse('.a..'), '<? class="a" class="" class=""></?>');
    });

    it('with attributes', () => {
        equal(parse('div[foo=bar]'), '<div foo="bar"></div>');
        equal(parse('div.a[b=c]'), '<div class="a" b="c"></div>');
        equal(parse('div[b=c].a'), '<div b="c" class="a"></div>');
        equal(parse('div[a=b][c="d"]'), '<div a="b" c="d"></div>');

        equal(parse('[b=c]'), '<? b="c"></?>');
        equal(parse('.a[b=c]'), '<? class="a" b="c"></?>');
        equal(parse('[b=c].a#d'), '<? b="c" class="a" id="d"></?>');
        equal(parse('[b=c]a'), '<? b="c"></?>', 'Do not consume node name after attribute set');
    });

    it('with text node', () => {
        equal(parse('div{foo}'), '<div>foo</div>');
        equal(parse('{foo}'), '<?>foo</?>');
    });

    it('mixed', () => {
        equal(parse('div.foo{bar}'), '<div class="foo">bar</div>');
        equal(parse('.foo{bar}#baz'), '<? class="foo" id="baz">bar</?>');
        equal(parse('.foo[b=c]{bar}'), '<? class="foo" b="c">bar</?>');
    });

    it('repeated', () => {
        equal(parse('div.foo*3'), '<div*3 class="foo"></div>');
        equal(parse('.a[b=c]*10'), '<?*10 class="a" b="c"></?>');
        equal(parse('.a*10[b=c]'), '<?*10 class="a" b="c"></?>');
        equal(parse('.a*10{text}'), '<?*10 class="a">text</?>');
    });

    it('self-closing', () => {
        equal(parse('div/'), '<div />');
        equal(parse('.foo/'), '<? class="foo" />');
        equal(parse('.foo[bar]/'), '<? class="foo" bar="" />');
        equal(parse('.foo/*3'), '<?*3 class="foo" />');
        equal(parse('.foo*3/'), '<?*3 class="foo" />');

        throws(() => parse('/'), /Unexpected self\-closing indicator/);
    });
});
