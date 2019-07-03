import { throws, deepEqual, ok } from 'assert';
import Scanner from '@emmetio/scanner';
import consumeAttributes from '../src/attribute';
import { EMAttribute } from '../src/ast';

describe('Attributes', () => {
    const parse = (str: string) => consumeAttributes(new Scanner(str))!;
    const names = (attrs: EMAttribute[]) => attrs.map(a => a.name);
    const values = (attrs: EMAttribute[]) => attrs.map(a => a.value && a.value.value);

    it('names', () => {
        let attrs = parse('[a]');
        deepEqual(names(attrs), ['a']);
        deepEqual(values(attrs), [undefined]);

        attrs = parse('[a b c [d]]');
        deepEqual(names(attrs), ['a', 'b', 'c', '[d]']);
        deepEqual(values(attrs), [undefined, undefined, undefined, undefined]);
    });

    it('unquoted values', () => {
        let attrs = parse('[a=b]');
        deepEqual(names(attrs), ['a']);
        deepEqual(values(attrs), ['b']);

        attrs = parse('[a=b c= d=e]');
        deepEqual(names(attrs), ['a', 'c', 'd']);
        deepEqual(values(attrs), ['b', undefined, 'e']);

        attrs = parse('[a=b.c d=тест]');
        deepEqual(names(attrs), ['a', 'd']);
        deepEqual(values(attrs), ['b.c', 'тест']);

        attrs = parse('[[a]=b (c)=d]');
        deepEqual(names(attrs), ['[a]', '(c)']);
        deepEqual(values(attrs), ['b', 'd']);
    });

    it('quoted values', () => {
        let attrs = parse('[a="b"]');
        deepEqual(names(attrs), ['a']);
        deepEqual(values(attrs), ['b']);

        attrs = parse('[a="b" c=\'d\' e=""]');
        deepEqual(names(attrs), ['a', 'c', 'e']);
        deepEqual(values(attrs), ['b', 'd', '']);

        attrs = parse('[[a]="b" (c)=\'d\']');
        deepEqual(names(attrs), ['[a]', '(c)']);
        deepEqual(values(attrs), ['b', 'd']);
    });

    it('mixed quotes', () => {
        const attrs = parse('[a="foo\'bar" b=\'foo"bar\' c="foo\\\"bar"]');
        deepEqual(names(attrs), ['a', 'b', 'c']);
        deepEqual(values(attrs), ['foo\'bar', 'foo"bar', 'foo\\"bar']);
    });

    it('boolean', () => {
        const attrs = parse('[a. b.]');
        deepEqual(names(attrs), ['a', 'b']);
        ok(attrs.every(a => a.boolean));
    });

    it('expressions', () => {
        const attrs = parse('[foo={1 + 2} bar={fn(1, "foo")}]');
        deepEqual(names(attrs), ['foo', 'bar']);
        deepEqual(values(attrs), ['1 + 2', 'fn(1, "foo")']);
        ok(attrs.every(a => a.value!.before === '{' && a.value!.after === '}'));
    });

    it('default attributes', () => {
        let attrs = parse('[a.b]');
        deepEqual(names(attrs), [undefined]);
        deepEqual(values(attrs), ['a.b']);

        attrs = parse('[a.b "c=d" foo=bar ./test.html]');
        deepEqual(names(attrs), [undefined, undefined, 'foo', undefined]);
        deepEqual(values(attrs), ['a.b', 'c=d', 'bar', './test.html']);
    });

    it('tabstops as unquoted values', () => {
        const attrs = parse('[name=${1} value=${2:test}]');
        deepEqual(names(attrs), ['name', 'value']);
        deepEqual(values(attrs), ['${1}', '${2:test}']);
    });

    it('errors', () => {
        throws(() => parse('[a'), /Expected closing "]" brace/);
        throws(() => parse('[a="foo]'), /Unable to consume quoted string/);
        throws(() => parse('[a={foo]'), /Unable to find closing/);
        throws(() => parse('[a=b=c]'), /Expected attribute name/);
    });
});
