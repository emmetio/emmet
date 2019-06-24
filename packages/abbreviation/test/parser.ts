import { equal } from 'assert';
import parser from '../src/parser';
import expander from '../src/index';
import stringify from './assets/stringify';

describe('Parser', () => {
    const parse = (str: string) => stringify(parser(str));
    const expand = (str: string) => stringify(expander(str));

    describe('Parse', () => {
        it('basic abbreviations', () => {
            equal(parse('a>b'), '<a><b></b></a>');
            equal(parse('a+b'), '<a></a><b></b>');
            equal(parse('a+b>c+d'), '<a></a><b><c></c><d></d></b>');
            equal(parse('a>b>c+e'), '<a><b><c></c><e></e></b></a>');
            equal(parse('a>b>c^d'), '<a><b><c></c></b><d></d></a>');
            equal(parse('a>b>c^^^^d'), '<a><b><c></c></b></a><d></d>');
        });

        it('groups', () => {
            equal(parse('a>(b>c)+d'), '<a><b><c></c></b><d></d></a>');
            equal(parse('(a>b)+(c>d)'), '<a><b></b></a><c><d></d></c>');
            equal(parse('a>((b>c)(d>e))f'), '<a><b><c></c></b><d><e></e></d><f></f></a>');
            equal(parse('a>((((b>c))))+d'), '<a><b><c></c></b><d></d></a>');
            equal(parse('a>(((b>c))*4)+d'), '<a>(<b><c></c></b>)*4<d></d></a>');
            equal(parse('(div>dl>(dt+dd)*2)'), '<div><dl>(<dt></dt><dd></dd>)*2</dl></div>');
        });
    });

    describe('Expand', () => {
        it('unroll repeated elements', () => {
            equal(expand('a*2>b*3'), '<a*2@1><b*3@1></b><b*3@2></b><b*3@3></b></a><a*2@2><b*3@1></b><b*3@2></b><b*3@3></b></a>');
            equal(expand('a>(b+c)*2'), '<a><b*2@1></b><c*2@1></c><b*2@2></b><c*2@2></c></a>');
        });
    });
});
