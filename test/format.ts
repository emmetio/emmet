import { equal } from 'assert';
import html from '../src/markup/format/html';
import haml from '../src/markup/format/haml';
import parse from '../src/markup';
import createConfig from '../src/config';
import { OutputProfileOptions } from '../src/OutputProfile';

describe('Format', () => {
    const defaultConfig = createConfig();
    const field = createConfig();
    field.options.field = (index, placeholder) => placeholder ? `\${${index}:${placeholder}}` : `\${${index}}`;

    function createProfile(profile: Partial<OutputProfileOptions>) {
        const config = createConfig();
        Object.assign(config.profile.options, profile);
        return config;
    }

    describe('HTML', () => {
        const format = (abbr: string, config = defaultConfig) => html(parse(abbr, config), config);
        it('basic', () => {
            equal(format('div>p'), '<div>\n\t<p></p>\n</div>');
            equal(format('div>p*3'), '<div>\n\t<p></p>\n\t<p></p>\n\t<p></p>\n</div>');
            equal(format('div#a>p.b*2>span'), '<div id="a">\n\t<p class="b"><span></span></p>\n\t<p class="b"><span></span></p>\n</div>');
            equal(format('div>div>div'), '<div>\n\t<div>\n\t\t<div></div>\n\t</div>\n</div>');

            equal(format('table>tr*2>td{item}*2'),
                '<table>\n\t<tr>\n\t\t<td>item</td>\n\t\t<td>item</td>\n\t</tr>\n\t<tr>\n\t\t<td>item</td>\n\t\t<td>item</td>\n\t</tr>\n</table>');
        });

        it('inline elements', () => {
            const profile = createProfile({ inlineBreak: 3 });
            const breakInline = createProfile({ inlineBreak: 1 });
            const keepInline = createProfile({ inlineBreak: 0 });
            const xhtml = createProfile({ selfClosingStyle: 'xhtml' });

            equal(format('div>a>b*3', xhtml), '<div>\n\t<a href="">\n\t\t<b></b>\n\t\t<b></b>\n\t\t<b></b>\n\t</a>\n</div>');

            equal(format('p>i', profile), '<p><i></i></p>');
            equal(format('p>i*2', profile), '<p><i></i><i></i></p>');
            equal(format('p>i*2', breakInline), '<p>\n\t<i></i>\n\t<i></i>\n</p>');
            equal(format('p>i*3', profile), '<p>\n\t<i></i>\n\t<i></i>\n\t<i></i>\n</p>');
            equal(format('p>i*3', keepInline), '<p><i></i><i></i><i></i></p>');

            equal(format('i*2', profile), '<i></i><i></i>');
            equal(format('i*3', profile), '<i></i>\n<i></i>\n<i></i>');
            equal(format('i{a}+i{b}', profile), '<i>a</i><i>b</i>');

            equal(format('img[src]/+p', xhtml), '<img src="" alt="" />\n<p></p>');
            equal(format('div>img[src]/+p', xhtml), '<div>\n\t<img src="" alt="" />\n\t<p></p>\n</div>');
            equal(format('div>p+img[src]/', xhtml), '<div>\n\t<p></p>\n\t<img src="" alt="" />\n</div>');
            equal(format('div>p+img[src]/+p', xhtml), '<div>\n\t<p></p>\n\t<img src="" alt="" />\n\t<p></p>\n</div>');
            equal(format('div>p+img[src]/*2+p', xhtml), '<div>\n\t<p></p>\n\t<img src="" alt="" /><img src="" alt="" />\n\t<p></p>\n</div>');
            equal(format('div>p+img[src]/*3+p', xhtml), '<div>\n\t<p></p>\n\t<img src="" alt="" />\n\t<img src="" alt="" />\n\t<img src="" alt="" />\n\t<p></p>\n</div>');
        });

        it('generate fields', () => {
            equal(format('a[href]', field), '<a href="${1}">${2}</a>');
            equal(format('a[href]*2', field), '<a href="${1}">${2}</a><a href="${3}">${4}</a>');
            equal(format('{${0} ${1:foo} ${2:bar}}*2', field), '${1} ${2:foo} ${3:bar}${4} ${5:foo} ${6:bar}');
            equal(format('{${0} ${1:foo} ${2:bar}}*2'), ' foo bar foo bar');
            equal(format('ul>li*2', field), '<ul>\n\t<li>${1}</li>\n\t<li>${2}</li>\n</ul>');
            equal(format('div>img[src]/', field), '<div><img src="${1}" alt="${2}"></div>');
        });

        // it.only('debug', () => {
        //     equal(format('div>{foo}+{bar}+p'), '<div>\n\tfoobar\n\t<p></p>\n</div>');
        // });

        it('mixed content', () => {
            equal(format('div{foo}'), '<div>foo</div>');
            equal(format('div>{foo}'), '<div>foo</div>');
            equal(format('div>{foo}+{bar}'), '<div>foobar</div>');
            equal(format('div>{foo}+{bar}+p'), '<div>\n\tfoobar\n\t<p></p>\n</div>');
            equal(format('div>{foo}+{bar}+p+{foo}+{bar}+p'), '<div>\n\tfoobar\n\t<p></p>\n\tfoobar\n\t<p></p>\n</div>');
            equal(format('div>{foo}+p+{bar}'), '<div>\n\tfoo\n\t<p></p>\n\tbar\n</div>');
            equal(format('div>{foo}>p'), '<div>\n\tfoo\n\t<p></p>\n</div>');

            equal(format('div>{<!-- ${0} -->}'), '<div><!--  --></div>');
            equal(format('div>{<!-- ${0} -->}+p'), '<div>\n\t<!--  -->\n\t<p></p>\n</div>');
            equal(format('div>p+{<!-- ${0} -->}'), '<div>\n\t<p></p>\n\t<!--  -->\n</div>');
            equal(format('div>{<!-- ${0} -->}>p'), '<div>\n\t<!-- <p></p> -->\n</div>');
            equal(format('div>{<!-- ${0} -->}*2>p'), '<div>\n\t<!-- <p></p> -->\n\t<!-- <p></p> -->\n</div>');

            equal(format('div>{<!-- ${0} -->}>p*2'), '<div>\n\t<!-- \n\t<p></p>\n\t<p></p>\n\t-->\n</div>');
            equal(format('div>{<!-- ${0} -->}*2>p*2'), '<div>\n\t<!-- \n\t<p></p>\n\t<p></p>\n\t-->\n\t<!-- \n\t<p></p>\n\t<p></p>\n\t-->\n</div>');

            equal(format('div>{<!-- ${0} -->}>b'), '<div>\n\t<!-- <b></b> -->\n</div>');
            equal(format('div>{<!-- ${0} -->}>b*2'), '<div>\n\t<!-- <b></b><b></b> -->\n</div>');
            equal(format('div>{<!-- ${0} -->}>b*3'), '<div>\n\t<!-- \n\t<b></b>\n\t<b></b>\n\t<b></b>\n\t-->\n</div>');

            equal(format('div>{<!-- ${0} -->}', field), '<div><!-- ${1} --></div>');
            equal(format('div>{<!-- ${0} -->}>b', field), '<div>\n\t<!-- <b>${1}</b> -->\n</div>');
        });

        it('self-closing', () => {
            const xmlStyle = createProfile({ selfClosingStyle: 'xml' });
            const htmlStyle = createProfile({ selfClosingStyle: 'html' });
            const xhtmlStyle = createProfile({ selfClosingStyle: 'xhtml' });

            equal(format('img[src]/', htmlStyle), '<img src="" alt="">');
            equal(format('img[src]/', xhtmlStyle), '<img src="" alt="" />');
            equal(format('img[src]/', xmlStyle), '<img src="" alt=""/>');
            equal(format('div>img[src]/', xhtmlStyle), '<div><img src="" alt="" /></div>');
        });

        it('boolean attributes', () => {
            const compact = createProfile({ compactBoolean: true });
            const noCompact = createProfile({ compactBoolean: false });

            equal(format('p[b.]', noCompact), '<p b="b"></p>');
            equal(format('p[b.]', compact), '<p b></p>');
            equal(format('p[contenteditable]', compact), '<p contenteditable></p>');
            equal(format('p[contenteditable]', noCompact), '<p contenteditable="contenteditable"></p>');
            equal(format('p[contenteditable=foo]', compact), '<p contenteditable="foo"></p>');
        });

        it('no formatting', () => {
            const profile = createProfile({ format: false });
            equal(format('div>p', profile), '<div><p></p></div>');
            equal(format('div>{foo}+p+{bar}', profile), '<div>foo<p></p>bar</div>');
            equal(format('div>{foo}>p', profile), '<div>foo<p></p></div>');
            equal(format('div>{<!-- ${0} -->}>p', profile), '<div><!-- <p></p> --></div>');
        });

        it('format specific nodes', () => {
            equal(format('{<!DOCTYPE html>}+html>(head>meta[charset=${charset}]/+title{${1:Document}})+body', field),
                '<!DOCTYPE html>\n<html>\n<head>\n\t<meta charset="charset">\n\t<title>${2:Document}</title>\n</head>\n<body>\n\t${3}\n</body>\n</html>');
        });

        it('comment', () => {
            const opt = createConfig();
            opt.options.comment = { enabled: true };

            equal(format('ul>li.item', opt), '<ul>\n\t<li class="item"></li>\n\t<!-- /.item -->\n</ul>');
            equal(format('div>ul>li.item#foo', opt), '<div>\n\t<ul>\n\t\t<li class="item" id="foo"></li>\n\t\t<!-- /#foo.item -->\n\t</ul>\n</div>');

            opt.options.comment = {
                enabled: true,
                after: ' { [%ID] }'
            };
            equal(format('div>ul>li.item#foo', opt), '<div>\n\t<ul>\n\t\t<li class="item" id="foo"></li> { %foo }\n\t</ul>\n</div>');
        });
    });

    describe('HAML', () => {
        const format = (abbr: string, config = defaultConfig) => haml(parse(abbr, config), config);

        it.only('basic', () => {
            equal(format('div#header>ul.nav>li[title=test].nav-item*2'),
                '#header\n\t%ul.nav\n\t\t%li.nav-item(title="test")\n\t\t%li.nav-item(title="test")');

            equal(format('div#foo[data-n1=v1 title=test data-n2=v2].bar'),
                '#foo.bar(data-n1="v1" title="test" data-n2="v2")');

            let profile = createProfile({ compactBoolean: true });
            equal(format('input[disabled. foo title=test]/', profile), '%input(type="text" disabled foo="" title="test")/');

            profile = createProfile({ compactBoolean: false });
            equal(format('input[disabled. foo title=test]/', profile), '%input(type="text" disabled=true foo="" title="test")/');
        });
    });
});
