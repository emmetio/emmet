import { equal, ok, deepEqual } from 'assert';
import SnippetsRegistry, { AllOptions } from '../src/index';
import { Snippet } from '../src/types';

const GLOBAL = 0;
const USER = 1;

describe('Snippets Registry', () => {
    it('create and fill', () => {
        const registry = new SnippetsRegistry([
            {a: 'b', c: 'd'},
            {a: 'b2', c2: 'd2'}
        ]);

        equal(registry.resolve('a')!.value, 'b2');
        equal(registry.resolve('c')!.value, 'd');
        equal(registry.resolve('c2')!.value, 'd2');
        equal(registry.resolve('a2'), undefined);

        // remove store
        registry.remove(GLOBAL);
        equal(registry.resolve('a')!.value, 'b2');
        equal(registry.resolve('c'), undefined);
        equal(registry.resolve('c2')!.value, 'd2');
        equal(registry.resolve('a2'), undefined);

        // replace store
        registry.add({ a2: 'b2', d2: 'e2' }, USER);
        equal(registry.resolve('a'), undefined);
        equal(registry.resolve('a2')!.value, 'b2');
        equal(registry.resolve('c2'), undefined);
        equal(registry.resolve('d2')!.value, 'e2');
    });

    it('resolve', () => {
        const toDict = (allSnippets: Snippet[]) => allSnippets.reduce((out, snippet) => {
            out[snippet.key.toString()] = snippet.value;
            return out;
        }, {});

        const registry = new SnippetsRegistry();
        const s1 = registry.add({ a: 'b2', c2: 'd2' }, USER);
        const s2 = registry.add({ a: 'b', c: 'd' });

        ok(s1);
        ok(s2);

        equal(registry.resolve('a')!.value, 'b2');
        equal(registry.resolve('c')!.value, 'd');
        equal(registry.resolve('c2')!.value, 'd2');
        deepEqual(toDict(registry.all()), {a: 'b2', c2: 'd2', c: 'd'});

        // disable store
        s1.disable();
        equal(registry.resolve('a')!.value, 'b');
        equal(registry.resolve('c')!.value, 'd');
        equal(registry.resolve('c2'), undefined);
        deepEqual(toDict(registry.all()), { a: 'b', c: 'd' });

        // enable store
        s1.enable();
        equal(registry.resolve('a')!.value, 'b2');
        equal(registry.resolve('c')!.value, 'd');
        equal(registry.resolve('c2')!.value, 'd2');
        deepEqual(toDict(registry.all()), { a: 'b2', c2: 'd2', c: 'd' });
    });

    it('all by type', () => {
        const registry = new SnippetsRegistry();
        registry.add(new Map()
            .set('a', 'b')
            .set('c', 'd')
            .set(/foo/, 'bar')
        );
        const keys = (opt?: AllOptions) => Array.from(registry.all(opt).map(snippet => snippet.key));

        deepEqual(keys(), ['a', 'c', /foo/]);
        deepEqual(keys({type: 'string'}), ['a', 'c']);
        deepEqual(keys({type: 'regexp'}), [/foo/]);
    });
});
