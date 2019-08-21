import { equal } from 'assert';
import parser, { ParserOptions } from '../src';
import stringify from './assets/stringify-node';

function parse(abbr: string, options?: ParserOptions) {
    return stringify(parser(abbr, options));
}

describe('Convert token abbreviations', () => {
    it('basic', () => {
        equal(parse('ul>li.item$*3'), '<ul><li*3@0 class="item1"></li><li*3@1 class="item2"></li><li*3@2 class="item3"></li></ul>');
        equal(parse('ul>li.item$*', { text: ['foo$', 'bar$'] }), '<ul><li*2@0 class="item1">foo$</li><li*2@1 class="item2">bar$</li></ul>');
        equal(parse('ul>li[class=$#]{item $}*', { text: ['foo$', 'bar$'] }), '<ul><li*2@0 class="foo$">item 1</li><li*2@1 class="bar$">item 2</li></ul>');
        equal(parse('ul>li.item$*'), '<ul><li*1@0 class="item1"></li></ul>');
        equal(parse('ul>li.item$*', { text: ['foo.bar', 'hello.world'] }), '<ul><li*2@0 class="item1">foo.bar</li><li*2@1 class="item2">hello.world</li></ul>');

        equal(parse('html[lang=${lang}]'), '<html lang="lang"></html>');
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
});
