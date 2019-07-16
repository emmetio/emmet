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
});
