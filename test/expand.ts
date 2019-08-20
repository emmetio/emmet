import { strictEqual as equal } from 'assert';
import expand from '../src';

describe('Expand Abbreviation', () => {
    describe('Markup', () => {
        it('basic', () => {
            equal(expand('ul>.item$*2'), '<ul>\n\t<li class="item1"></li>\n\t<li class="item2"></li>\n</ul>');

            // insert text into abbreviation
            equal(expand('ul>.item$*', { text: ['foo', 'bar'] }), '<ul>\n\t<li class="item1">foo</li>\n\t<li class="item2">bar</li>\n</ul>');

            // insert TextMate-style fields/tabstops in output
            equal(expand('ul>.item$*2', {
                options: {
                    'output.field': (index, placeholder) => `\${${index}${placeholder ? ':' + placeholder : ''}}`
                }
            }), '<ul>\n\t<li class="item1">${1}</li>\n\t<li class="item2">${2}</li>\n</ul>');
        });

        it('syntax', () => {
            equal(expand('ul>.item$*2', { syntax: 'html' }), '<ul>\n\t<li class="item1"></li>\n\t<li class="item2"></li>\n</ul>');
            equal(expand('ul>.item$*2', { syntax: 'slim' }), 'ul\n\tli.item1 \n\tli.item2 ');
            equal(expand('xsl:variable[name=a select=b]>div', { syntax: 'xsl' }), '<xsl:variable name="a">\n\t<div></div>\n</xsl:variable>');
        });

        it('custom profile', () => {
            equal(expand('img'), '<img src="" alt="">');
            equal(expand('img', { options: { 'output.selfClosingStyle': 'xhtml' } }), '<img src="" alt="" />');
        });

        it('custom variables', () => {
            const variables = { charset: 'ru-RU' };

            equal(expand('[charset=${charset}]{${charset}}'), '<div charset="UTF-8">UTF-8</div>');
            equal(expand('[charset=${charset}]{${charset}}', { variables }), '<div charset="ru-RU">ru-RU</div>');
        });

        it('custom snippets', () => {
            const snippets = {
                link: 'link[foo=bar href]/',
                foo: '.foo[bar=baz]',
                repeat: 'div>ul>li{Hello World}*3'
            };

            equal(expand('foo', { snippets }), '<div class="foo" bar="baz"></div>');

            // `link:css` depends on `link` snippet so changing it will result in
            // altered `link:css` result
            equal(expand('link:css'), '<link rel="stylesheet" href="style.css">');
            equal(expand('link:css', { snippets }), '<link foo="bar" href="style.css">');

            // https://github.com/emmetio/emmet/issues/468
            equal(expand('repeat', { snippets }), '<div>\n\t<ul>\n\t\t<li>Hello World</li>\n\t\t<li>Hello World</li>\n\t\t<li>Hello World</li>\n\t</ul>\n</div>');
        });

        it('formatter options', () => {
            equal(expand('ul>.item$*2'), '<ul>\n\t<li class="item1"></li>\n\t<li class="item2"></li>\n</ul>');
            equal(expand('ul>.item$*2', { options: { 'comment.enabled': true } }),
                '<ul>\n\t<li class="item1"></li>\n\t<!-- /.item1 -->\n\t<li class="item2"></li>\n\t<!-- /.item2 -->\n</ul>');
        });

        it('reverse attributes merge', () => {
            equal(expand('a.test'), '<a href="" class="test"></a>');
            equal(expand('a.test', { options: { 'output.reverseAttributes': true } }), '<a class="test" href=""></a>');
        });

        // it.only('debug', () => {
        //     equal(expand('link:css'), '<link rel="stylesheet" href="style.css">');
        // });
    });
});
