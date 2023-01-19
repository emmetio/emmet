import { strictEqual as equal } from 'assert';
import createStream, { push, pushString, pushNewline, tagName, attrName, selfClose, isInline } from '../src/output-stream.js';
import createConfig, { defaultOptions } from '../src/config.js';

describe('Output', () => {
    it('stream', () => {
        const out = createStream({
            ...defaultOptions,
            'output.baseIndent': '>>'
        });

        push(out, 'aaa');
        equal(out.value, 'aaa');
        equal(out.line, 0);
        equal(out.column, 3);
        equal(out.offset, 3);

        pushString(out, 'bbb');
        equal(out.value, 'aaabbb');
        equal(out.line, 0);
        equal(out.column, 6);
        equal(out.offset, 6);

        // Add text with newlines
        pushString(out, 'ccc\nddd');
        equal(out.value, 'aaabbbccc\n>>ddd');
        equal(out.line, 1);
        equal(out.column, 5);
        equal(out.offset, 15);

        // Add newline with indent
        out.level++;
        pushNewline(out, true);
        equal(out.value, 'aaabbbccc\n>>ddd\n>>\t');
        equal(out.line, 2);
        equal(out.column, 3);
        equal(out.offset, 19);
    });

    describe('Output profile', () => {
        it('tag name', () => {
            const asis = createConfig({ options: { 'output.tagCase': '' } });
            const upper = createConfig({ options: { 'output.tagCase': 'upper' } });
            const lower = createConfig({ options: { 'output.tagCase': 'lower' } });

            equal(tagName('Foo', asis), 'Foo');
            equal(tagName('bAr', asis), 'bAr');

            equal(tagName('Foo', upper), 'FOO');
            equal(tagName('bAr', upper), 'BAR');

            equal(tagName('Foo', lower), 'foo');
            equal(tagName('bAr', lower), 'bar');
        });

        it('attribute name', () => {
            const asis = createConfig({ options: { 'output.attributeCase': '' } });
            const upper = createConfig({ options: { 'output.attributeCase': 'upper' } });
            const lower = createConfig({ options: { 'output.attributeCase': 'lower' } });

            equal(attrName('Foo', asis), 'Foo');
            equal(attrName('bAr', asis), 'bAr');

            equal(attrName('Foo', upper), 'FOO');
            equal(attrName('bAr', upper), 'BAR');

            equal(attrName('Foo', lower), 'foo');
            equal(attrName('bAr', lower), 'bar');
        });

        it('self close', () => {
            const html = createConfig({ options: { 'output.selfClosingStyle': 'html' } });
            const xhtml = createConfig({ options: { 'output.selfClosingStyle': 'xhtml' } });
            const xml = createConfig({ options: { 'output.selfClosingStyle': 'xml' } });

            equal(selfClose(html), '');
            equal(selfClose(xhtml), ' /');
            equal(selfClose(xml), '/');
        });

        it('inline elements', () => {
            const config = createConfig();
            equal(isInline('a', config), true);
            equal(isInline('b', config), true);
            equal(isInline('c', config), false);
        });
    });
});
