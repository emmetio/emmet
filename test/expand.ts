import { strictEqual as equal } from 'assert';
import expand, { resolveConfig } from '../src';

describe('Expand Abbreviation', () => {
    describe('Markup', () => {
        it('basic', () => {
            equal(expand('input[value="text$"]*2'), '<input type="text" value="text1"><input type="text" value="text2">');
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

        it('attributes', () => {
            const snippets = {
                test: 'test[!foo bar. baz={}]'
            };
            const opt = { snippets };
            const reverse = {
                options: { 'output.reverseAttributes': true },
                snippets
            };

            equal(expand('a.test'), '<a href="" class="test"></a>');
            equal(expand('a.test', reverse), '<a class="test" href=""></a>');

            equal(expand('test', opt), '<test bar="bar" baz={}></test>');
            equal(expand('test[foo]', opt), '<test bar="bar" baz={}></test>');
            equal(expand('test[baz=a foo=1]', opt), '<test foo="1" bar="bar" baz={a}></test>');

            equal(expand('map'), '<map name=""></map>');
            equal(expand('map[]'), '<map name=""></map>');
            equal(expand('map[name="valid"]'), '<map name="valid"></map>');
            equal(expand('map[href="invalid"]'), '<map name="" href="invalid"></map>');

            // Apply attributes in reverse order
            equal(expand('test', reverse), '<test bar="bar" baz={}></test>');
            equal(expand('test[foo]', reverse), '<test bar="bar" baz={}></test>');
            equal(expand('test[baz=a foo=1]', reverse), '<test baz={a} foo="1" bar="bar"></test>');
        });

        it('numbering', () => {
            equal(expand('ul>li.item$@-*5'), '<ul>\n\t<li class="item5"></li>\n\t<li class="item4"></li>\n\t<li class="item3"></li>\n\t<li class="item2"></li>\n\t<li class="item1"></li>\n</ul>');
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

            equal(expand('div>p'), '<div>\n\t<p></p>\n</div>');
            equal(expand('div>p', { options: { 'output.formatLeafNode': true } }), '<div>\n\t<p>\n\t\t\n\t</p>\n</div>');
        });

        it('JSX', () => {
            const config = { syntax: 'jsx' };
            equal(expand('div#foo.bar', config), '<div id="foo" className="bar"></div>');
            equal(expand('label[for=a]', config), '<label htmlFor="a"></label>');
            equal(expand('Foo.Bar', config), '<Foo.Bar></Foo.Bar>');
            equal(expand('div.{theme.style}', config), '<div className={theme.style}></div>');
        });

        it('override attributes', () => {
            const config = { syntax: 'jsx' };
            equal(expand('.bar', config), '<div className="bar"></div>');
            equal(expand('..bar', config), '<div styleName={styles.bar}></div>');
            equal(expand('..foo-bar', config), '<div styleName={styles[\'foo-bar\']}></div>');

            equal(expand('.foo', { syntax: 'vue' }), '<div class="foo"></div>');
            equal(expand('..foo', { syntax: 'vue' }), '<div :class="foo"></div>');
        });

        it('wrap with abbreviation', () => {
            equal(expand('div>ul', { text: ['<div>line1</div>\n<div>line2</div>'] }),
                '<div>\n\t<ul>\n\t\t<div>line1</div>\n\t\t<div>line2</div>\n\t</ul>\n</div>');
            equal(expand('p', { text: 'foo\nbar' }), '<p>\n\tfoo\n\tbar\n</p>');
            equal(expand('p', { text: '<div>foo</div>' }), '<p>\n\t<div>foo</div>\n</p>');
            equal(expand('p', { text: '<span>foo</span>' }), '<p><span>foo</span></p>');
            equal(expand('p', { text: 'foo<span>foo</span>' }), '<p>foo<span>foo</span></p>');
            equal(expand('p', { text: 'foo<div>foo</div>' }), '<p>foo<div>foo</div></p>');
        });

        it('wrap with abbreviation href', () => {
            equal(expand('a', { text: ['www.google.it'] }), '<a href="http://www.google.it">www.google.it</a>');
            equal(expand('a', { text: ['then www.google.it'] }), '<a href="">then www.google.it</a>');
            equal(expand('a', { text: ['www.google.it'], options: { 'markup.href': false } }), '<a href="">www.google.it</a>');

            equal(expand('map[name="https://example.com"]', { text: ['some text'] }),
                '<map name="https://example.com">some text</map>');
            equal(expand('map[href="https://example.com"]', { text: ['some text'] }),
                '<map name="" href="https://example.com">some text</map>');
            equal(expand('map[name="https://example.com"]>b', { text: ['some text'] }),
                '<map name="https://example.com"><b>some text</b></map>');

            equal(expand('a[href="https://example.com"]>b', { text: ['<u>some text false</u>'], options: { 'markup.href': false } }),
                '<a href="https://example.com"><b><u>some text false</u></b></a>');
            equal(expand('a[href="https://example.com"]>b', { text: ['<u>some text true</u>'], options: { 'markup.href': true } }),
                '<a href="https://example.com"><b><u>some text true</u></b></a>');
            equal(expand('a[href="https://example.com"]>div', { text: ['<p>some text false</p>'], options: { 'markup.href': false } }),
                '<a href="https://example.com">\n\t<div>\n\t\t<p>some text false</p>\n\t</div>\n</a>');
            equal(expand('a[href="https://example.com"]>div', { text: ['<p>some text true</p>'], options: { 'markup.href': true } }),
                '<a href="https://example.com">\n\t<div>\n\t\t<p>some text true</p>\n\t</div>\n</a>');
        });

        // it.only('debug', () => {
        //     equal(expand('link:css'), '<link rel="stylesheet" href="style.css">');
        // });
    });

    describe('Pug templates', () => {
        const config = resolveConfig({ syntax: 'pug' });
        it('basic', () => {
            equal(expand('!', config), 'doctype html\nhtml(lang="en")\n\thead\n\t\tmeta(charset="UTF-8")\n\t\tmeta(name="viewport", content="width=device-width, initial-scale=1.0")\n\t\ttitle Document\n\tbody ');
        });
    });
});
