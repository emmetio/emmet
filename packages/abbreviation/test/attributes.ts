import { equal, throws, deepEqual } from 'assert';
import StreamReader from '@emmetio/stream-reader';
import consumeAttributes from '../src/attribute';
import { RawAttribute } from '@emmetio/node';

describe('Attributes', () => {
    const parse = (str: string) => consumeAttributes(new StreamReader(str)) as RawAttribute[];

    it('names', () => {
        let attrs = parse('[a]');
        deepEqual(parse('[a]'), [{name: 'a'}]);

        attrs = parse('[a b c]');
        equal(attrs.length, 3);
        deepEqual(attrs[0], {name: 'a'});
        deepEqual(attrs[1], {name: 'b'});
        deepEqual(attrs[2], {name: 'c'});
    });

    it('unquoted values', () => {
        let attrs = parse('[a=b]');
        equal(attrs.length, 1);
        deepEqual(attrs[0], {name: 'a', value: 'b'});

        attrs = parse('[a=b c= d=e]');
        equal(attrs.length, 3);
        deepEqual(attrs[0], {name: 'a', value: 'b'});
        deepEqual(attrs[1], {name: 'c'});
        deepEqual(attrs[2], {name: 'd', value: 'e'});

        attrs = parse('[a=b.c d=тест]');
        equal(attrs.length, 2);
        deepEqual(attrs[0], {name: 'a', value: 'b.c'});
        deepEqual(attrs[1], {name: 'd', value: 'тест'});
    });

    it('with quoted values', () => {
        let attrs = parse('[a="b"]');
        equal(attrs.length, 1);
        deepEqual(attrs[0], {name: 'a', value: 'b'});

        attrs = parse('[a="b" c=\'d\' e=""]');
        equal(attrs.length, 3);
        deepEqual(attrs[0], {name: 'a', value: 'b'});
        deepEqual(attrs[1], {name: 'c', value: 'd'});
        deepEqual(attrs[2], {name: 'e', value: ''});
    });

    it('mixed quotes', () => {
        const attrs = parse('[a="foo\'bar" b=\'foo"bar\' c="foo\\\"bar"]');
        equal(attrs.length, 3);
        deepEqual(attrs[0], {name: 'a', value: 'foo\'bar'});
        deepEqual(attrs[1], {name: 'b', value: 'foo"bar'});
        deepEqual(attrs[2], {name: 'c', value: 'foo\\"bar'});
    });

    it('boolean', () => {
        const options = {boolean: true};
        const attrs = parse('[a. b.]');

        equal(attrs.length, 2);
        deepEqual(attrs[0], {name: 'a', options});
        deepEqual(attrs[1], {name: 'b', options});
    });

    it('React expressions', () => {
        const options = {before: '{', after: '}'};
        const attrs = parse('[foo={1 + 2} bar={fn(1, "foo")}]');

        equal(attrs.length, 2);
        deepEqual(attrs[0], {name: 'foo', value: '1 + 2', options});
        deepEqual(attrs[1], {name: 'bar', value: 'fn(1, "foo")', options});
    });

    it('default attributes', () => {
        let attrs = parse('[a.b]');
        equal(attrs.length, 1);
        deepEqual(attrs[0], {name: null, value: 'a.b'});

        attrs = parse('[a.b "c=d" foo=bar ./test.html]');
        equal(attrs.length, 4);
        deepEqual(attrs[0], {name: null, value: 'a.b'});
        deepEqual(attrs[1], {name: null, value: 'c=d'});
        deepEqual(attrs[2], {name: 'foo', value: 'bar'});
        deepEqual(attrs[3], {name: null, value: './test.html'});
    });

    it('tabstops as unquoted values', () => {
        const attrs = parse('[name=${1} value=${2:test}]');
        equal(attrs.length, 2);
        deepEqual(attrs[0], {name: 'name', value: '${1}'});
        deepEqual(attrs[1], {name: 'value', value: '${2:test}'});
    });

    it('errors', () => {
        throws(() => parse('[a'), /Expected closing "]" brace/);
        throws(() => parse('[a="foo]'), /Unable to consume quoted string/);
        throws(() => parse('[a={foo]'), /Unable to find closing/);
        throws(() => parse('[a=b=c]'), /Expected attribute name/);
    });
});
