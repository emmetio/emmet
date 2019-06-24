import { equal, throws } from 'assert';
import StreamReader from '@emmetio/stream-reader';
import consumeTextNode from '../src/text';

describe('Text node', () => {
    const parse = (str: string) => consumeTextNode(new StreamReader(str));

    it('parse', () => {
        equal(parse('{a b c}'), 'a b c');
        equal(parse('{a "b c"}'), 'a "b c"');
        equal(parse('{isn\'t bad}'), 'isn\'t bad');
        equal(parse('{foo(a => {return "b"});}'), 'foo(a => {return "b"});');
        equal(parse('{foo(a => {return "b\\}"});}'), 'foo(a => {return "b}"});');
        equal(parse('{foo\\}bar}'), 'foo}bar');
        equal(parse('{foo\\{bar\\}baz}'), 'foo{bar}baz');
        equal(parse('{foo\\"}bar}'), 'foo\\"');
    });

    it('errors', () => {
        throws(() => parse('{foo'), /Unable to find closing/);
        throws(() => parse('{foo => {}'), /Unable to find closing/);
    });
});
