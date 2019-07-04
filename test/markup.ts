import { strictEqual } from 'assert';
import { parse } from '../src/markup';
import stringify from '../src/markup/stringify';
import resolveConfig from '../src/config';
import { ResolvedConfig } from '../src/types';

const defaultConfig = resolveConfig({ type: 'markup' });
// Reset snippets to keep raw snippet names
defaultConfig.snippets.reset();

function expand(abbr: string, config: ResolvedConfig = defaultConfig): string {
    return stringify(parse(abbr, config));
}

describe('Markup abbreviations', () => {
    it('basics', () => {
        strictEqual(expand('ul>.item$*2'), '<ul><li class="item1"></li><li class="item2"></li></ul>');
    });

    it('unroll', () => {
        strictEqual(expand('a>(b>c)+d'), '<a><b><c></c></b><d></d></a>');
        strictEqual(expand('(a>b)+(c>d)'), '<a><b></b></a><c><d></d></c>');
        strictEqual(expand('a>((b>c)(d>e))f'), '<a><b><c></c></b><d><e></e></d><f></f></a>');
        strictEqual(expand('a>((((b>c))))+d'), '<a><b><c></c></b><d></d></a>');
        strictEqual(expand('a>(((b>c))*4)+d'), '<a><b><c></c></b><b><c></c></b><b><c></c></b><b><c></c></b><d></d></a>');
        strictEqual(expand('(div>dl>(dt+dd)*2)'), '<div><dl><dt></dt><dd></dd><dt></dt><dd></dd></dl></div>');

        strictEqual(expand('a*2>b*3'), '<a><b></b><b></b><b></b></a><a><b></b><b></b><b></b></a>');
        strictEqual(expand('a>(b+c)*2'), '<a><b></b><c></c><b></b><c></c></a>');
        strictEqual(expand('a>(b+c)*2+(d+e)*2'), '<a><b></b><c></c><b></b><c></c><d></d><e></e><d></d><e></e></a>');
    });
});
