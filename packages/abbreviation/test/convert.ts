import { equal } from 'assert';
import parser, { ParserOptions } from '../src';
import stringify from './assets/stringify-node';

function parse(abbr: string, options?: ParserOptions) {
    return stringify(parser(abbr, options));
}

describe('Convert token abbreviations', () => {
    it('basic', () => {
        equal(parse('input[value="text$"]*2'), '<input*2@0 value="text1"></input><input*2@1 value="text2"></input>');

        equal(parse('ul>li.item$*3'), '<ul><li*3@0 class="item1"></li><li*3@1 class="item2"></li><li*3@2 class="item3"></li></ul>');
        equal(parse('ul>li.item$*', { text: ['foo$', 'bar$'] }), '<ul><li*2@0 class="item1">foo$</li><li*2@1 class="item2">bar$</li></ul>');
        equal(parse('ul>li[class=$#]{item $}*', { text: ['foo$', 'bar$'] }), '<ul><li*2@0 class="foo$">item 1</li><li*2@1 class="bar$">item 2</li></ul>');
        equal(parse('ul>li.item$*'), '<ul><li*1@0 class="item1"></li></ul>');
        equal(parse('ul>li.item$*', { text: ['foo.bar', 'hello.world'] }), '<ul><li*2@0 class="item1">foo.bar</li><li*2@1 class="item2">hello.world</li></ul>');

        equal(parse('p{hi}', { text: ['hello'] }), '<p>hihello</p>');
        equal(parse('p*{hi}', { text: ['1', '2'] }), '<p*2@0>hi1</p><p*2@1>hi2</p>');
        equal(parse('div>p+p{hi}', { text: ['hello'] }), '<div><p></p><p>hihello</p></div>');

        equal(parse('html[lang=${lang}]'), '<html lang="lang"></html>');
        equal(parse('html.one.two'), '<html class="one", class="two"></html>');
        equal(parse('html.one[two=three]'), '<html class="one", two="three"></html>');
        equal(parse('div{[}+a{}'), '<div>[</div><a></a>');
    });

    it('unroll', () => {
        equal(parse('a>(b>c)+d'), '<a><b><c></c></b><d></d></a>');
        equal(parse('(a>b)+(c>d)'), '<a><b></b></a><c><d></d></c>');
        equal(parse('a>((b>c)(d>e))f'), '<a><b><c></c></b><d><e></e></d><f></f></a>');
        equal(parse('a>((((b>c))))+d'), '<a><b><c></c></b><d></d></a>');
        equal(parse('a>(((b>c))*4)+d'), '<a><b*4@0><c></c></b><b*4@1><c></c></b><b*4@2><c></c></b><b*4@3><c></c></b><d></d></a>');
        equal(parse('(div>dl>(dt+dd)*2)'), '<div><dl><dt*2@0></dt><dd*2@0></dd><dt*2@1></dt><dd*2@1></dd></dl></div>');

        equal(parse('a*2>b*3'), '<a*2@0><b*3@0></b><b*3@1></b><b*3@2></b></a><a*2@1><b*3@0></b><b*3@1></b><b*3@2></b></a>');
        equal(parse('a>(b+c)*2'), '<a><b*2@0></b><c*2@0></c><b*2@1></b><c*2@1></c></a>');
        equal(parse('a>(b+c)*2+(d+e)*2'), '<a><b*2@0></b><c*2@0></c><b*2@1></b><c*2@1></c><d*2@0></d><e*2@0></e><d*2@1></d><e*2@1></e></a>');

        // Should move `<div>` as sibling of `{foo}`
        equal(parse('p>{foo}>div'), '<p><?>foo</?><div></div></p>');
        equal(parse('p>{foo ${0}}>div'), '<p><?>foo ${0}<div></div></?></p>');
    });

    it('limit unroll', () => {
        // Limit amount of repeated elements
        equal(parse('a*10', { maxRepeat: 5 }), '<a*10@0></a><a*10@1></a><a*10@2></a><a*10@3></a><a*10@4></a>');
        equal(parse('a*10'), '<a*10@0></a><a*10@1></a><a*10@2></a><a*10@3></a><a*10@4></a><a*10@5></a><a*10@6></a><a*10@7></a><a*10@8></a><a*10@9></a>');
        equal(parse('a*3>b*3', { maxRepeat: 5 }), '<a*3@0><b*3@0></b><b*3@1></b><b*3@2></b></a><a*3@1><b*3@0></b></a>');
    });

    it('parent repeater', () => {
        equal(parse('a$*2>b$*3/'), '<a1*2@0><b1*3@0 /><b2*3@1 /><b3*3@2 /></a1><a2*2@1><b1*3@0 /><b2*3@1 /><b3*3@2 /></a2>');
        equal(parse('a$*2>b$@^*3/'), '<a1*2@0><b1*3@0 /><b2*3@1 /><b3*3@2 /></a1><a2*2@1><b4*3@0 /><b5*3@1 /><b6*3@2 /></a2>');
    });

    it('href', () => {
        equal(parse('a', { href: true, text: 'https://www.google.it' }), '<a href="https://www.google.it">https://www.google.it</a>');
        equal(parse('a', { href: true, text: 'www.google.it' }), '<a href="http://www.google.it">www.google.it</a>');
        equal(parse('a', { href: true, text: 'google.it' }), '<a href="">google.it</a>');
        equal(parse('a', { href: true, text: 'test here' }), '<a href="">test here</a>');
        equal(parse('a', { href: true, text: 'test@domain.com' }), '<a href="mailto:test@domain.com">test@domain.com</a>');
        equal(parse('a', { href: true, text: 'test here test@domain.com' }), '<a href="">test here test@domain.com</a>');
        equal(parse('a', { href: true, text: 'test here www.domain.com' }), '<a href="">test here www.domain.com</a>');

        equal(parse('a[href=]', { href: true, text: 'https://www.google.it' }), '<a href="https://www.google.it">https://www.google.it</a>');
        equal(parse('a[href=]', { href: true, text: 'www.google.it' }), '<a href="http://www.google.it">www.google.it</a>');
        equal(parse('a[href=]', { href: true, text: 'google.it' }), '<a href="">google.it</a>');
        equal(parse('a[href=]', { href: true, text: 'test here' }), '<a href="">test here</a>');
        equal(parse('a[href=]', { href: true, text: 'test@domain.com' }), '<a href="mailto:test@domain.com">test@domain.com</a>');
        equal(parse('a[href=]', { href: true, text: 'test here test@domain.com' }), '<a href="">test here test@domain.com</a>');
        equal(parse('a[href=]', { href: true, text: 'test here www.domain.com' }), '<a href="">test here www.domain.com</a>');
        equal(parse('a[class=here]', { href: true, text: 'test@domain.com' }), '<a class="here", href="mailto:test@domain.com">test@domain.com</a>');
        equal(parse('a.here', { href: true, text: 'www.domain.com' }), '<a class="here", href="http://www.domain.com">www.domain.com</a>');
        equal(parse('a[class=here]', { href: true, text: 'test here test@domain.com' }), '<a class="here", href="">test here test@domain.com</a>');
        equal(parse('a.here', { href: true, text: 'test here www.domain.com' }), '<a class="here", href="">test here www.domain.com</a>');

        equal(parse('a[href="www.google.it"]', { href: false, text: 'test' }), '<a href="www.google.it">test</a>');
        equal(parse('a[href="www.example.com"]', { href: true, text: 'www.google.it' }), '<a href="www.example.com">www.google.it</a>');
    });

    it('wrap basic', () => {
        equal(parse('p', { text: 'test' }), '<p>test</p>');
        equal(parse('p', { text: ['test'] }), '<p>test</p>');
        equal(parse('p', { text: ['test1', 'test2'] }), '<p>test1\ntest2</p>');
        equal(parse('p', { text: ['test1', '', 'test2'] }), '<p>test1\n\ntest2</p>');
        equal(parse('p*', { text: ['test1', 'test2'] }), '<p*2@0>test1</p><p*2@1>test2</p>');
        equal(parse('p*', { text: ['test1', '', 'test2'] }), '<p*2@0>test1</p><p*2@1>test2</p>');
    })
});
