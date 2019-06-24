import { equal, ok } from 'assert';
import StreamReader from '../src/index';

describe('Stream Reader', () => {
    it('basic', () => {
        const data = 'hello';
        const s = new StreamReader(data);

        equal(s.string, data);
        equal(s.start, 0);
        equal(s.pos, 0);

        equal(s.peek(), data.charCodeAt(0));
        equal(s.start, 0);
        equal(s.pos, 0);

        equal(s.next(), data.charCodeAt(0));
        equal(s.next(), data.charCodeAt(1));
        equal(s.start, 0);
        equal(s.pos, 2);

        equal(s.next(), data.charCodeAt(2));
        equal(s.start, 0);
        equal(s.pos, 3);

        equal(s.current(), data.slice(0, 3));
    });

    it('should limit reader range', () => {
        const outer = new StreamReader('foo bar baz');
        const inner = outer.limit(4, 7);

        ok(outer !== inner);

        let outerValue = '';
        let innerValue = '';

        while (!outer.eof()) {
            outerValue += String.fromCharCode(outer.next()!);
        }

        while (!inner.eof()) {
            innerValue += String.fromCharCode(inner.next()!);
        }

        equal(outerValue, 'foo bar baz');
        equal(innerValue, 'bar');
    });
});
