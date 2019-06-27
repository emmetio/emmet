import { equal } from 'assert';
import parser from '../src/index';
import stringify from './assets/stringify';

describe('Parser', () => {
    const parse = (str: string) => stringify(parser(str));

    it('basic abbreviations', () => {
        equal(parse('a>b'), '<a><b></b></a>');
        equal(parse('a+b'), '<a></a><b></b>');
        equal(parse('a+b>c+d'), '<a></a><b><c></c><d></d></b>');
        equal(parse('a>b>c+e'), '<a><b><c></c><e></e></b></a>');
        equal(parse('a>b>c^d'), '<a><b><c></c></b><d></d></a>');
        equal(parse('a>b>c^^^^d'), '<a><b><c></c></b></a><d></d>');
    });

    it('groups', () => {
        equal(parse('a>(b>c)+d'), '<a>(<b><c></c></b>)<d></d></a>');
        equal(parse('(a>b)+(c>d)'), '(<a><b></b></a>)(<c><d></d></c>)');
        equal(parse('a>((b>c)(d>e))f'), '<a>((<b><c></c></b>)(<d><e></e></d>))<f></f></a>');
        equal(parse('a>((((b>c))))+d'), '<a>((((<b><c></c></b>))))<d></d></a>');
        equal(parse('a>(((b>c))*4)+d'), '<a>(((<b><c></c></b>))*4)<d></d></a>');
        equal(parse('(div>dl>(dt+dd)*2)'), '(<div><dl>(<dt></dt><dd></dd>)*2</dl></div>)');
        equal(parse('a>()'), '<a>()</a>');

    });
});
