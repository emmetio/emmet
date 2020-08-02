import { strictEqual as equal, ok } from 'assert';
import { stylesheet as expandAbbreviation, resolveConfig, CSSAbbreviationScope } from '../src';
import score from '../src/stylesheet/score';

const defaultConfig = resolveConfig({
    type: 'stylesheet',
    options: {
        'output.field': (index, placeholder) => `\${${index}${placeholder ? ':' + placeholder : ''}}`,
        'stylesheet.fuzzySearchMinScore': 0
    },
    snippets: {
        mten: 'margin: 10px;',
        fsz: 'font-size'
    },
    cache: {},
});

function expand(abbr: string, config = defaultConfig) {
    return expandAbbreviation(abbr, config);
}

describe('Stylesheet abbreviations', () => {
    describe('Scoring', () => {
        const pick = (abbr: string, items: string[]) => items
            .map(item => ({ item, score: score(abbr, item, true) }))
            .filter(obj => obj.score)
            .sort((a, b) => b.score - a.score)
            .map(obj => obj.item)[0];

        it('compare scores', () => {
            equal(score('aaa', 'aaa'), 1);
            equal(score('baa', 'aaa'), 0);

            ok(!score('b', 'aaa'));
            ok(score('a', 'aaa'));
            ok(score('a', 'abc'));
            ok(score('ac', 'abc'));
            ok(score('a', 'aaa') < score('aa', 'aaa'));
            ok(score('ab', 'abc') > score('ab', 'acb'));

            // acronym bonus
            ok(score('ab', 'a-b') > score('ab', 'acb'));
        });

        it('pick padding or position', () => {
            const items = ['p', 'pb', 'pl', 'pos', 'pa', 'oa', 'soa', 'pr', 'pt'];

            equal(pick('p', items), 'p');
            equal(pick('poa', items), 'pos');
        });
    });

    it('keywords', () => {
        equal(expand('bd1-s'), 'border: 1px solid;');
        equal(expand('dib'), 'display: inline-block;');
        equal(expand('bxsz'), 'box-sizing: ${1:border-box};');
        equal(expand('bxz'), 'box-sizing: ${1:border-box};');
        equal(expand('bxzc'), 'box-sizing: content-box;');
        equal(expand('fl'), 'float: ${1:left};');
        equal(expand('fll'), 'float: left;');

        equal(expand('pos'), 'position: ${1:relative};');
        equal(expand('poa'), 'position: absolute;');
        equal(expand('por'), 'position: relative;');
        equal(expand('pof'), 'position: fixed;');
        equal(expand('pos-a'), 'position: absolute;');

        equal(expand('m'), 'margin: ${0};');
        equal(expand('m0'), 'margin: 0;');

        // use `auto` as global keyword
        equal(expand('m0-a'), 'margin: 0 auto;');
        equal(expand('m-a'), 'margin: auto;');

        equal(expand('bg'), 'background: ${1:#000};');

        equal(expand('bd'), 'border: ${1:1px} ${2:solid} ${3:#000};');
        equal(expand('bd0-s#fc0'), 'border: 0 solid #fc0;');
        equal(expand('bd0-dd#fc0'), 'border: 0 dot-dash #fc0;');
        equal(expand('bd0-h#fc0'), 'border: 0 hidden #fc0;');

        equal(expand('trf-trs'), 'transform: translate(${1:x}, ${2:y});');
    });

    it('numeric', () => {
        equal(expand('p0'), 'padding: 0;', 'No unit for 0');
        equal(expand('p10'), 'padding: 10px;', '`px` unit for integers');
        equal(expand('p.4'), 'padding: 0.4em;', '`em` for floats');
        equal(expand('fz10'), 'font-size: 10px;', '`px` for integers');
        equal(expand('fz1.'), 'font-size: 1em;', '`em` for explicit float');
        equal(expand('p10p'), 'padding: 10%;', 'unit alias');
        equal(expand('z10'), 'z-index: 10;', 'Unitless property');
        equal(expand('p10r'), 'padding: 10rem;', 'unit alias');
        equal(expand('mten'), 'margin: 10px;', 'Ignore terminating `;` in snippet');

        // https://github.com/microsoft/vscode/issues/59951
        equal(expand('fz'), 'font-size: ${0};');
        equal(expand('fz12'), 'font-size: 12px;');
        equal(expand('fsz'), 'font-size: ${0};');
        equal(expand('fsz12'), 'font-size: 12px;');
        equal(expand('fs'), 'font-style: ${1:italic};');

        // https://github.com/emmetio/emmet/issues/558
        equal(expand('us'), 'user-select: none;');
    });

    it('numeric with format options', () => {
        const config = resolveConfig({
            type: 'stylesheet',
            options: {
                'stylesheet.intUnit': 'pt',
                'stylesheet.floatUnit': 'vh',
                'stylesheet.unitAliases': {
                    e: 'em',
                    p: '%',
                    x: 'ex',
                    r: ' / @rem'
                }
            }
        });
        equal(expand('p0', config), 'padding: 0;', 'No unit for 0');
        equal(expand('p10', config), 'padding: 10pt;', '`pt` unit for integers');
        equal(expand('p.4', config), 'padding: 0.4vh;', '`vh` for floats');
        equal(expand('p10p', config), 'padding: 10%;', 'unit alias');
        equal(expand('z10', config), 'z-index: 10;', 'Unitless property');
        equal(expand('p10r', config), 'padding: 10 / @rem;', 'unit alias');
    });

    it('important', () => {
        equal(expand('!'), '!important');
        equal(expand('p!'), 'padding: ${0} !important;');
        equal(expand('p0!'), 'padding: 0 !important;');
    });

    it('color', () => {
        equal(expand('c'), 'color: ${1:#000};');
        equal(expand('c#'), 'color: #000;');
        equal(expand('c#f.5'), 'color: rgba(255, 255, 255, 0.5);');
        equal(expand('c#f.5!'), 'color: rgba(255, 255, 255, 0.5) !important;');
        equal(expand('bgc'), 'background-color: #${1:fff};');
    });

    it('snippets', () => {
        equal(expand('@'), '@media ${1:screen} {\n\t${0}\n}');

        // Insert value into snippet fields
        equal(expand('@k-name'), '@keyframes name {\n\t${2}\n}');
        equal(expand('@k-name10'), '@keyframes name {\n\t10\n}');
    });

    it('multiple properties', () => {
        equal(expand('p10+m10-20'), 'padding: 10px;\nmargin: 10px 20px;');
        equal(expand('p+bd'), 'padding: ${0};\nborder: ${1:1px} ${2:solid} ${3:#000};');
    });

    it('functions', () => {
        equal(expand('trf-s(2)'), 'transform: scale(2, ${2:y});');
        equal(expand('trf-s(2, 3)'), 'transform: scale(2, 3);');
    });

    it('case insensitive matches', () => {
        equal(expand('trf:rx'), 'transform: rotateX(${1:angle});');
    });

    it('gradient resolver', () => {
        equal(expand('lg'), 'background-image: linear-gradient(${0});');
        equal(expand('lg(to right, #0, #f00.5)'), 'background-image: linear-gradient(to right, #000, rgba(255, 0, 0, 0.5));');
    });

    it('unmatched abbreviation', () => {
        // This example is useless: it’s unexpected to receive `align-self: unset`
        // for `auto` snippet
        // equal(expand('auto', resolveConfig({
        //     type: 'stylesheet',
        //     options: { 'stylesheet.fuzzySearchMinScore': 0 }
        // })), 'align-self: unset;');
        equal(expand('auto'), 'auto: ${0};');
    });

    it('CSS-in-JS', () => {
        const config = resolveConfig({
            type: 'stylesheet',
            options: {
                'stylesheet.json': true,
                'stylesheet.between': ': '
            }
        });

        equal(expand('p10+mt10-20', config), 'padding: 10,\nmarginTop: \'10px 20px\',');
        equal(expand('bgc', config), 'backgroundColor: \'#fff\',');
    });

    it('resolve context value', () => {
        const config = resolveConfig({
            type: 'stylesheet',
            context: { name: 'align-content' }
        });

        equal(expand('s', config), 'start');
        equal(expand('a', config), 'auto');
    });

    it('limit snippets by scope', () => {
        const sectionScope = resolveConfig({
            type: 'stylesheet',
            context: { name: CSSAbbreviationScope.Section },
            snippets: {
                mten: 'margin: 10px;',
                fsz: 'font-size',
                myCenterAwesome: 'body {\n\tdisplay: grid;\n}'
            }
        });
        const propertyScope = resolveConfig({
            type: 'stylesheet',
            context: { name: CSSAbbreviationScope.Property },
            snippets: {
                mten: 'margin: 10px;',
                fsz: 'font-size',
                myCenterAwesome: 'body {\n\tdisplay: grid;\n}'
            }
        });

        equal(expand('m', sectionScope), 'body {\n\tdisplay: grid;\n}');
        equal(expand('b', sectionScope), '');
        equal(expand('m', propertyScope), 'margin: ;');
    });
});
