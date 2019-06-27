import { deepEqual } from 'assert';
import Scanner from '@emmetio/scanner';
import consumeRepeat from '../src/repeat';

describe('Repeat', () => {
    const parse = (str: string) => consumeRepeat(new Scanner(str));

    it('basic', () => {
        deepEqual(parse('*3'), { count: 3 });
        deepEqual(parse('*123'), { count: 123 });
        deepEqual(parse('*123foo'), { count: 123 });
        deepEqual(parse('*'), { count: null });
    });
});
