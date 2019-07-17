import { equal } from 'assert';
import parser, { ParserOptions } from '../src';
import stringify from './assets/stringify-node';

function parse(abbr: string, options?: ParserOptions) {
    return stringify(parser(abbr, options));
}

describe('Convert token abbreviations', () => {
    it('basic', () => {
        equal(parse('ul>li.item$*3'), '<ul><li class="item1"></li><li class="item2"></li><li class="item3"></li></ul>');
        equal(parse('ul>li.item$*', { text: ['foo$', 'bar$'] }), '<ul><li class="item1">foo$</li><li class="item2">bar$</li></ul>');
        equal(parse('ul>li[class=$#]{item $}*', { text: ['foo$', 'bar$'] }), '<ul><li class="foo$">item 1</li><li class="bar$">item 2</li></ul>');
        equal(parse('ul>li.item$*'), '<ul><li class="item1"></li></ul>');
        equal(parse('ul>li.item$*', { text: ['foo.bar', 'hello.world'] }), '<ul><li class="item1">foo.bar</li><li class="item2">hello.world</li></ul>');
    });

    it('unroll', () => {
        equal(parse('a>(b>c)+d'), '<a><b><c></c></b><d></d></a>');
        equal(parse('(a>b)+(c>d)'), '<a><b></b></a><c><d></d></c>');
        equal(parse('a>((b>c)(d>e))f'), '<a><b><c></c></b><d><e></e></d><f></f></a>');
        equal(parse('a>((((b>c))))+d'), '<a><b><c></c></b><d></d></a>');
        equal(parse('a>(((b>c))*4)+d'), '<a><b><c></c></b><b><c></c></b><b><c></c></b><b><c></c></b><d></d></a>');
        equal(parse('(div>dl>(dt+dd)*2)'), '<div><dl><dt></dt><dd></dd><dt></dt><dd></dd></dl></div>');

        equal(parse('a*2>b*3'), '<a><b></b><b></b><b></b></a><a><b></b><b></b><b></b></a>');
        equal(parse('a>(b+c)*2'), '<a><b></b><c></c><b></b><c></c></a>');
        equal(parse('a>(b+c)*2+(d+e)*2'), '<a><b></b><c></c><b></b><c></c><d></d><e></e><d></d><e></e></a>');
    });
});
