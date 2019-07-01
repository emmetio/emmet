import { equal } from 'assert';
import SnippetsRegistry from '../src/SnippetsRegistry';

describe('Snippets Registry', () => {
    it('resolve', () => {
        const storage = new SnippetsRegistry();

        equal(storage.get('foo'), undefined);

        storage.set('foo', 'bar');
        equal(storage.get('foo')!.key, 'foo');
        equal(storage.get('foo')!.value, 'bar');

        storage.set('a1|a2', 'baz');
        equal(storage.get('a1')!.key, 'a1');
        equal(storage.get('a1')!.value, 'baz');
        equal(storage.get('a2')!.key, 'a2');
        equal(storage.get('a2')!.value, 'baz');

        storage.set(/foo\d+/, 'ban');
        equal(storage.get('foo')!.value, 'bar');
        equal(storage.get('foo123')!.value, 'ban');

        equal(storage.values().length, 4);

        storage.reset();
        equal(storage.get('foo'), undefined);
        equal(storage.get('foo123'), undefined);
        equal(storage.values().length, 0);
    });

    it('batch load (object)', () => {
        const storage = new SnippetsRegistry({
            'foo': 'bar',
            'a1|a2': 'baz'
        });

        equal(storage.get('foo')!.key, 'foo');
        equal(storage.get('foo')!.value, 'bar');
        equal(storage.get('a1')!.key, 'a1');
        equal(storage.get('a1')!.value, 'baz');
        equal(storage.get('a2')!.key, 'a2');
        equal(storage.get('a2')!.value, 'baz');
    });

    it('batch load (array)', () => {
        const storage = new SnippetsRegistry([
            ['foo', 'bar'],
            ['a1|a2', 'baz'],
            [/foo\d+/, 'ban']
        ]);

        equal(storage.get('foo')!.key, 'foo');
        equal(storage.get('foo')!.value, 'bar');
        equal(storage.get('foo123')!.value, 'ban');
        equal(storage.get('a1')!.key, 'a1');
        equal(storage.get('a1')!.value, 'baz');
        equal(storage.get('a2')!.key, 'a2');
        equal(storage.get('a2')!.value, 'baz');
    });
});
