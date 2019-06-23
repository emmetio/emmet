import { equal, ok } from 'assert';
import SnippetsStorage from '../src/storage';

describe('Storage', () => {
    it('create', () => {
        const storage = new SnippetsStorage();

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
        const storage = new SnippetsStorage({
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

    it('batch load (map)', () => {
        const storage = new SnippetsStorage(new Map()
            .set('foo', 'bar')
            .set('a1|a2', 'baz')
            .set(/foo\d+/, 'ban')
        );

        equal(storage.get('foo')!.key, 'foo');
        equal(storage.get('foo')!.value, 'bar');
        equal(storage.get('foo123')!.value, 'ban');
        equal(storage.get('a1')!.key, 'a1');
        equal(storage.get('a1')!.value, 'baz');
        equal(storage.get('a2')!.key, 'a2');
        equal(storage.get('a2')!.value, 'baz');
    });

    it('enable/disable', () => {
        const storage = new SnippetsStorage({ foo: 'bar' });

        equal(storage.disabled, false);
        ok(storage.get('foo'));

        storage.disable();
        equal(storage.disabled, true);
        equal(storage.get('foo'), undefined);

        storage.enable();
        equal(storage.disabled, false);
        ok(storage.get('foo'));
    });
});
