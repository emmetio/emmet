import { equal, throws } from 'assert';
import Scanner from '@emmetio/scanner';
import consumeLiteral from '../src/literal';

describe('Literal', () => {
    const parse = (str: string) => consumeLiteral(new Scanner(str))!;

    it('parse', () => {
        equal(parse('{a b c}').value, 'a b c');
        equal(parse('{a "b c"}').value, 'a "b c"');
        equal(parse('{a "b c"}').before, '{');
        equal(parse('{a "b c"}').after, '}');
        equal(parse('{isn\'t bad}').value, 'isn\'t bad');
        equal(parse('{foo(a => {return "b"});}').value, 'foo(a => {return "b"});');
        equal(parse('{foo(a => {return "b\\}"});}').value, 'foo(a => {return "b\\}"});');
        equal(parse('{foo\\}bar}').value, 'foo\\}bar');
        equal(parse('{foo\\{bar\\}baz}').value, 'foo\\{bar\\}baz');
        equal(parse('{foo\\"}bar}').value, 'foo\\"');
    });

    it('errors', () => {
        throws(() => parse('{foo'), /Unable to find closing/);
        throws(() => parse('{foo => {}'), /Unable to find closing/);
    });
});
