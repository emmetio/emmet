import { describe, it } from 'node:test';
import { strictEqual as equal, ok, throws } from 'node:assert';
import StreamReader from '../src/scanner';
import { eatPair, eatQuoted } from '../src/utils';

describe('Pairs', () => {
    const code = (ch: string) => ch.charCodeAt(0);

    it('eat', () => {
        const stream = new StreamReader('[foo] (bar (baz) bam)');

        ok(eatPair(stream, code('['), code(']')));
        equal(stream.start, 0);
        equal(stream.pos, 5);
        equal(stream.current(), '[foo]');

        // No pair here
        ok(!eatPair(stream, code('('), code(')'), { throws: true }));
        stream.eatWhile(code(' '));

        ok(eatPair(stream, code('('), code(')'), { throws: true }));
        equal(stream.start, 6);
        equal(stream.pos, 21);
        equal(stream.current(), '(bar (baz) bam)');
    });

    it('eat with quotes', () => {
        const stream = new StreamReader('[foo "bar]" ]');
        ok(eatPair(stream, code('['), code(']')));
        equal(stream.start, 0);
        equal(stream.pos, 13);
        equal(stream.current(), '[foo "bar]" ]');
    });

    it('handle invalid', () => {
        const stream = new StreamReader('[foo');
        ok(!eatPair(stream, code('['), code(']')));
        equal(stream.start, 0);
        equal(stream.pos, 0);

        throws(() => ok(!eatPair(stream, code('['), code(']'), { throws: true })),
            /Unable to find matching pair/);
    });
});

describe('Quoted', () => {
    it('eat quoted', () => {
        const data = '"foo"   \'bar\'';
        const stream = new StreamReader(data);

        ok(eatQuoted(stream));
        equal(stream.start, 0);
        equal(stream.pos, 5);
        equal(stream.current(), '"foo"');

        // no double-quoted value ahead
        ok(!eatQuoted(stream, { throws: true }));

        // eat space
        ok(stream.eatWhile(' '.charCodeAt(0)));
        equal(stream.pos, 8);

        ok(eatQuoted(stream));
        equal(stream.start, 8);
        equal(stream.pos, 13);
        equal(stream.current(), '\'bar\'');
        ok(stream.eof());
    });

    it('handle broken strings', () => {
        const stream = new StreamReader('"foo');
        ok(!eatQuoted(stream));
        equal(stream.pos, 0);

        throws(() => eatQuoted(stream, { throws: true }), /Unable to consume quoted string/);
    });

    it('handle escapes', () => {
        const stream = new StreamReader('"foo\\"bar" baz');
        ok(eatQuoted(stream));
        equal(stream.start, 0);
        equal(stream.pos, 10);
        equal(stream.current(), '"foo\\"bar"');
    });
});
