import { strictEqual as equal } from 'assert';
import { stylesheet as expandAbbreviation, parseStylesheetSnippets, resolveConfig } from '../src';

const defaultConfig = resolveConfig({
    type: 'stylesheet',
    options: {
        'output.field': (index, placeholder) => `\${${index}${placeholder ? ':' + placeholder : ''}}`
    }
});
const snippets = parseStylesheetSnippets(defaultConfig.snippets);

function expand(abbr: string, config = defaultConfig) {
    return expandAbbreviation(abbr, config, snippets);
}

describe('Stylesheet', () => {
    describe('Snippet resolver', () => {
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
    });
});
