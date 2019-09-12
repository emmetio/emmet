import { equal, throws } from 'assert';
import parser from '../src/parser';
import tokenizer from '../src/tokenizer';
import stringify from './assets/stringify';
import { ParserOptions } from '../src';

const parse = (abbr: string, options?: ParserOptions) => parser(tokenizer(abbr), options);
const str = (abbr: string, options?: ParserOptions) => stringify(parse(abbr, options));

describe('Parser', () => {
    it('basic abbreviations', () => {
        equal(str('p'), '<p></p>');
        equal(str('p{text}'), '<p>text</p>');
        equal(str('h$'), '<h$></h$>');
        equal(str('.nav'), '<? class=nav></?>');
        equal(str('div.width1\\/2'), '<div class=width1/2></div>');
        equal(str('#sample*3'), '<?*3 id=sample></?>');

        // https://github.com/emmetio/emmet/issues/562
        equal(str('li[repeat.for="todo of todoList"]'), '<li repeat.for="todo of todoList"></li>', 'Dots in attribute names');

        equal(str('a>b'), '<a><b></b></a>');
        equal(str('a+b'), '<a></a><b></b>');
        equal(str('a+b>c+d'), '<a></a><b><c></c><d></d></b>');
        equal(str('a>b>c+e'), '<a><b><c></c><e></e></b></a>');
        equal(str('a>b>c^d'), '<a><b><c></c></b><d></d></a>');
        equal(str('a>b>c^^^^d'), '<a><b><c></c></b></a><d></d>');

        equal(str('ul.nav[title="foo"]'), '<ul class=nav title="foo"></ul>');
    });

    it('groups', () => {
        equal(str('a>(b>c)+d'), '<a>(<b><c></c></b>)<d></d></a>');
        equal(str('(a>b)+(c>d)'), '(<a><b></b></a>)(<c><d></d></c>)');
        equal(str('a>((b>c)(d>e))f'), '<a>((<b><c></c></b>)(<d><e></e></d>))<f></f></a>');
        equal(str('a>((((b>c))))+d'), '<a>((((<b><c></c></b>))))<d></d></a>');
        equal(str('a>(((b>c))*4)+d'), '<a>(((<b><c></c></b>))*4)<d></d></a>');
        equal(str('(div>dl>(dt+dd)*2)'), '(<div><dl>(<dt></dt><dd></dd>)*2</dl></div>)');
        equal(str('a>()'), '<a>()</a>');
    });

    it('attributes', () => {
        equal(str('[].foo'), '<? class=foo></?>');
        equal(str('[a]'), '<? a></?>');
        equal(str('[a b c [d]]'), '<? a b c [d]></?>');
        equal(str('[a=b]'), '<? a=b></?>');
        equal(str('[a=b c= d=e]'), '<? a=b c d=e></?>');
        equal(str('[a=b.c d=тест]'), '<? a=b.c d=тест></?>');
        equal(str('[[a]=b (c)=d]'), '<? [a]=b (c)=d></?>');

        // Quoted attribute values
        equal(str('[a="b"]'), '<? a="b"></?>');
        equal(str('[a="b" c=\'d\' e=""]'), '<? a="b" c=\'d\' e=""></?>');
        equal(str('[[a]="b" (c)=\'d\']'), '<? [a]="b" (c)=\'d\'></?>');

        // Mixed quoted
        equal(str('[a="foo\'bar" b=\'foo"bar\' c="foo\\\"bar"]'), '<? a="foo\'bar" b=\'foo"bar\' c="foo"bar"></?>');

        // Boolean & implied attributes
        equal(str('[a. b.]'), '<? a. b.></?>');
        equal(str('[!a !b.]'), '<? !a !b.></?>');

        // Default values
        equal(str('["a.b"]'), '<? ?="a.b"></?>');
        equal(str('[\'a.b\' "c=d" foo=bar "./test.html"]'), '<? ?=\'a.b\' ?="c=d" foo=bar ?="./test.html"></?>');

        // Expressions as values
        equal(str('[foo={1 + 2} bar={fn(1, "foo")}]'), '<? foo={1 + 2} bar={fn(1, "foo")}></?>');

        // Tabstops as unquoted values
        equal(str('[name=${1} value=${2:test}]'), '<? name=${1} value=${2:test}></?>');
    });

    it('malformed attributes', () => {
        equal(str('[a'), '<? a></?>');
        equal(str('[a={foo]'), '<? a={foo]></?>');
        throws(() => str('[a="foo]'), /Unclosed quote/);
        throws(() => str('[a=b=c]'), /Unexpected "Operator" token/);
    });

    it('elements', () => {
        equal(str('div'), '<div></div>');
        equal(str('div.foo'), '<div class=foo></div>');
        equal(str('div#foo'), '<div id=foo></div>');
        equal(str('div#foo.bar'), '<div id=foo class=bar></div>');
        equal(str('div.foo#bar'), '<div class=foo id=bar></div>');
        equal(str('div.foo.bar.baz'), '<div class=foo class=bar class=baz></div>');
        equal(str('.foo'), '<? class=foo></?>');
        equal(str('#foo'), '<? id=foo></?>');
        equal(str('.foo_bar'), '<? class=foo_bar></?>');
        equal(str('#foo.bar'), '<? id=foo class=bar></?>');

        // Attribute shorthands
        equal(str('.'), '<? class></?>');
        equal(str('#'), '<? id></?>');
        equal(str('#.'), '<? id class></?>');
        equal(str('.#.'), '<? class id class></?>');
        equal(str('.a..'), '<? class=a class class></?>');

        // Elements with attributes
        equal(str('div[foo=bar]'), '<div foo=bar></div>');
        equal(str('div.a[b=c]'), '<div class=a b=c></div>');
        equal(str('div[b=c].a'), '<div b=c class=a></div>');
        equal(str('div[a=b][c="d"]'), '<div a=b c="d"></div>');
        equal(str('[b=c]'), '<? b=c></?>');
        equal(str('.a[b=c]'), '<? class=a b=c></?>');
        equal(str('[b=c].a#d'), '<? b=c class=a id=d></?>');
        equal(str('[b=c]a'), '<? b=c></?><a></a>', 'Do not consume node name after attribute set');

        // Element with text
        equal(str('div{foo}'), '<div>foo</div>');
        equal(str('{foo}'), '<?>foo</?>');

        // Mixed
        equal(str('div.foo{bar}'), '<div class=foo>bar</div>');
        equal(str('.foo{bar}#baz'), '<? class=foo id=baz>bar</?>');
        equal(str('.foo[b=c]{bar}'), '<? class=foo b=c>bar</?>');

        // Repeated element
        equal(str('div.foo*3'), '<div*3 class=foo></div>');
        equal(str('.foo*'), '<?* class=foo></?>');
        equal(str('.a[b=c]*10'), '<?*10 class=a b=c></?>');
        equal(str('.a*10[b=c]'), '<?*10 class=a b=c></?>');
        equal(str('.a*10{text}'), '<?*10 class=a>text</?>');

        // Self-closing element
        equal(str('div/'), '<div />');
        equal(str('.foo/'), '<? class=foo />');
        equal(str('.foo[bar]/'), '<? class=foo bar />');
        equal(str('.foo/*3'), '<?*3 class=foo />');
        equal(str('.foo*3/'), '<?*3 class=foo />');

        throws(() => parse('/'), /Unexpected character/);
    });

    it('JSX', () => {
        const opt = { jsx: true };
        equal(str('foo.bar', opt), '<foo class=bar></foo>');
        equal(str('Foo.bar', opt), '<Foo class=bar></Foo>');
        equal(str('Foo.Bar', opt), '<Foo.Bar></Foo.Bar>');
        equal(str('Foo.Bar.baz', opt), '<Foo.Bar class=baz></Foo.Bar>');
        equal(str('Foo.Bar.Baz', opt), '<Foo.Bar.Baz></Foo.Bar.Baz>');

        equal(str('.{theme.class}', opt), '<? class=theme.class></?>');
        equal(str('#{id}', opt), '<? id=id></?>');
        equal(str('Foo.{theme.class}', opt), '<Foo class=theme.class></Foo>');
    });
});
