import { strictEqual } from 'assert';
import parse from '../src/markup';
import resolveConfig from '../src/config';
import { ResolvedConfig } from '../src/types';
import stringify from './assets/stringify';

const defaultConfig = resolveConfig({ type: 'markup' });
// Reset snippets to keep raw snippet names
defaultConfig.snippets.reset();

function expand(abbr: string, config?: Partial<ResolvedConfig>): string {
    return stringify(parse(abbr, { ...defaultConfig, ...config }));
}

describe('Markup abbreviations', () => {
    it('implicit tags', () => {
        strictEqual(expand('.'), '<div class=""></div>');
        strictEqual(expand('.foo>.bar'), '<div class="foo"><div class="bar"></div></div>');
        strictEqual(expand('p.foo>.bar'), '<p class="foo"><span class="bar"></span></p>');
        strictEqual(expand('ul>.item*2'), '<ul><li*2@0 class="item"></li><li*2@1 class="item"></li></ul>');
        strictEqual(expand('table>.row>.cell'), '<table><tr class="row"><td class="cell"></td></tr></table>');
        strictEqual(expand('{test}'), 'test');
        strictEqual(expand('.{test}'), '<div class="">test</div>');
        strictEqual(expand('ul>.item$*2'), '<ul><li*2@0 class="item1"></li><li*2@1 class="item2"></li></ul>');
    });

});
