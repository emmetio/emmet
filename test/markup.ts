import { strictEqual as equal } from 'assert';
import parse from '../src/markup';
import resolveConfig from '../src/config';
import stringify from './assets/stringify';

const defaultConfig = resolveConfig();

function expand(abbr: string, config = defaultConfig): string {
    return stringify(parse(abbr, config));
}

describe('Markup abbreviations', () => {
    it('implicit tags', () => {
        equal(expand('.'), '<div class=""></div>');
        equal(expand('.foo>.bar'), '<div class="foo"><div class="bar"></div></div>');
        equal(expand('p.foo>.bar'), '<p class="foo"><span class="bar"></span></p>');
        equal(expand('ul>.item*2'), '<ul><li*2@0 class="item"></li><li*2@1 class="item"></li></ul>');
        equal(expand('table>.row>.cell'), '<table><tr class="row"><td class="cell"></td></tr></table>');
        equal(expand('{test}'), 'test');
        equal(expand('.{test}'), '<div class="">test</div>');
        equal(expand('ul>.item$*2'), '<ul><li*2@0 class="item1"></li><li*2@1 class="item2"></li></ul>');
    });

    it('JSX', () => {
        const config = resolveConfig({ syntax: 'jsx' });
        equal(expand('div#foo.bar', config), '<div id="foo" className="bar"></div>');
        equal(expand('label[for=a]', config), '<label htmlFor="a"></label>');
    });

    it('XSL', () => {
        const config = resolveConfig({ syntax: 'xsl' });
        equal(expand('xsl:variable[select]', config), '<xsl:variable select=""></xsl:variable>');
        equal(expand('xsl:with-param[select]', config), '<xsl:with-param select=""></xsl:with-param>');
        equal(expand('xsl:variable[select]>div', config), '<xsl:variable><div></div></xsl:variable>');
        equal(expand('xsl:with-param[select]{foo}', config), '<xsl:with-param>foo</xsl:with-param>');
    });

    describe('BEM transform', () => {
        const config = resolveConfig({
            options: { 'bem.enabled': true }
        });

        it('modifiers', () => {
            equal(expand('div.b_m', config), '<div class="b b_m"></div>');
            equal(expand('div.b._m', config), '<div class="b b_m"></div>');
            equal(expand('div.b_m1._m2', config), '<div class="b b_m1 b_m2"></div>');
            equal(expand('div.b>div._m', config), '<div class="b"><div class="b b_m"></div></div>');
            equal(expand('div.b>div._m1>div._m2', config), '<div class="b"><div class="b b_m1"><div class="b b_m2"></div></div></div>');

            // classnames with -
            equal(expand('div.b>div._m1-m2', config), '<div class="b"><div class="b b_m1-m2"></div></div>');
        });

        it('elements', () => {
            equal(expand('div.b>div.-e', config), '<div class="b"><div class="b__e"></div></div>');
            equal(expand('div.b>div.---e', config), '<div class="b"><div class="b__e"></div></div>');
            equal(expand('div.b>div.-e>div.-e', config), '<div class="b"><div class="b__e"><div class="b__e"></div></div></div>');
            equal(expand('div', config), '<div></div>', 'Fixes bug with empty class');

            // get block name from proper ancestor
            equal(expand('div.b1>div.b2_m1>div.-e1+div.---e2_m2', config),
                '<div class="b1"><div class="b2 b2_m1"><div class="b2__e1"></div><div class="b1__e2 b1__e2_m2"></div></div></div>');

            // class names with -
            equal(expand('div.b>div.-m1-m2', config), '<div class="b"><div class="b__m1-m2"></div></div>');

            // class names with _
            equal(expand('div.b_m_o', config), '<div class="b b_m_o"></div>');
        });

        it('customize modifier', () => {
            const localConfig = resolveConfig({
                options: {
                    'bem.enabled': true,
                    'bem.element': '-',
                    'bem.modifier': '__'
                }
            });
            equal(expand('div.b_m', localConfig), '<div class="b b__m"></div>');
            equal(expand('div.b._m', localConfig), '<div class="b b__m"></div>');
        });

        it('multiple classes after modifier/element', () => {
            equal(expand('div.b_m.c', config), '<div class="b b_m c"></div>');
            equal(expand('div.b>div._m.c', config), '<div class="b"><div class="b b_m c"></div></div>');
            equal(expand('div.b>div.-m.c', config), '<div class="b"><div class="b__m c"></div></div>');
        });
    });
});
