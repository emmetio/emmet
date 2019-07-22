import { deepEqual, throws } from 'assert';
import tokenize from '../src/tokenizer';

describe('Tokenizer', () => {
    it('numeric values', () => {
        deepEqual(tokenize('p10'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 10, unit: '', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('p-10'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: '', start: 1, end: 4 }
        ]);

        deepEqual(tokenize('p-10-'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: 'value-delimiter', start: 4, end: 5 }
        ]);

        deepEqual(tokenize('p-10-20'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: 'value-delimiter', start: 4, end: 5 },
            { type: 'NumberValue', value: 20, unit: '', start: 5, end: 7 }
        ]);

        deepEqual(tokenize('p-10--20'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: 'value-delimiter', start: 4, end: 5 },
            { type: 'NumberValue', value: -20, unit: '', start: 5, end: 8 }
        ]);

        deepEqual(tokenize('p-10-20--30'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: 'value-delimiter', start: 4, end: 5 },
            { type: 'NumberValue', value: 20, unit: '', start: 5, end: 7 },
            { type: 'Operator', operator: 'value-delimiter', start: 7, end: 8 },
            { type: 'NumberValue', value: -30, unit: '', start: 8, end: 11 }
        ]);

        deepEqual(tokenize('p-10p-20--30'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: 'p', start: 1, end: 5 },
            { type: 'Operator', operator: 'value-delimiter', start: 5, end: 6 },
            { type: 'NumberValue', value: 20, unit: '', start: 6, end: 8 },
            { type: 'Operator', operator: 'value-delimiter', start: 8, end: 9 },
            { type: 'NumberValue', value: -30, unit: '', start: 9, end: 12 }
        ]);

        deepEqual(tokenize('p-10%-20--30'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, unit: '%', start: 1, end: 5 },
            { type: 'Operator', operator: 'value-delimiter', start: 5, end: 6 },
            { type: 'NumberValue', value: 20, unit: '', start: 6, end: 8 },
            { type: 'Operator', operator: 'value-delimiter', start: 8, end: 9 },
            { type: 'NumberValue', value: -30, unit: '', start: 9, end: 12 }
        ]);
    });

    it('float values', () => {
        deepEqual(tokenize('p.5'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.5, unit: '', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('p-.5'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -0.5, unit: '', start: 1, end: 4 }
        ]);

        deepEqual(tokenize('p.1.2.3'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.1, unit: '', start: 1, end: 3 },
            { type: 'NumberValue', value: 0.2, unit: '', start: 3, end: 5 },
            { type: 'NumberValue', value: 0.3, unit: '', start: 5, end: 7 }
        ]);

        deepEqual(tokenize('p.1-.2.3'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.1, unit: '', start: 1, end: 3 },
            { type: 'Operator', operator: 'value-delimiter', start: 3, end: 4 },
            { type: 'NumberValue', value: 0.2, unit: '', start: 4, end: 6 },
            { type: 'NumberValue', value: 0.3, unit: '', start: 6, end: 8 }
        ]);

        deepEqual(tokenize('p.1--.2.3'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.1, unit: '', start: 1, end: 3 },
            { type: 'Operator', operator: 'value-delimiter', start: 3, end: 4 },
            { type: 'NumberValue', value: -0.2, unit: '', start: 4, end: 7 },
            { type: 'NumberValue', value: 0.3, unit: '', start: 7, end: 9 }
        ]);

        deepEqual(tokenize('10'), [
            { type: 'NumberValue', value: 10, unit: '', start: 0, end: 2 },
        ]);

        deepEqual(tokenize('.1'), [
            { type: 'NumberValue', value: 0.1, unit: '', start: 0, end: 2 },
        ]);

        throws(() => tokenize('.foo'), /Unexpected character at 1/);
    });

    it('color values', () => {
        deepEqual(tokenize('c#'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: '', alpha: undefined, start: 1, end: 2 }
        ]);

        deepEqual(tokenize('c#1'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: '1', alpha: undefined, start: 1, end: 3 }
        ]);

        deepEqual(tokenize('c#f'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: 'f', alpha: undefined, start: 1, end: 3 }
        ]);

        deepEqual(tokenize('c#a#b#c'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: 'a', alpha: undefined, start: 1, end: 3 },
            { type: 'ColorValue', color: 'b', alpha: undefined, start: 3, end: 5 },
            { type: 'ColorValue', color: 'c', alpha: undefined, start: 5, end: 7 }
        ]);

        deepEqual(tokenize('c#af'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: 'af', alpha: undefined, start: 1, end: 4 }
        ]);

        deepEqual(tokenize('c#fc0'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: 'fc0', alpha: undefined, start: 1, end: 5 }
        ]);

        deepEqual(tokenize('c#11.5'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: '11', alpha: 0.5, start: 1, end: 6 }
        ]);

        deepEqual(tokenize('c#.99'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: '', alpha: 0.99, start: 1, end: 5 }
        ]);

        deepEqual(tokenize('c#t'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', color: 't', alpha: undefined, start: 1, end: 3 }
        ]);
    });

    it('keywords', () => {
        deepEqual(tokenize('m:a'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: 'property-delimiter', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 }
        ]);

        deepEqual(tokenize('m-a'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: 'value-delimiter', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 }
        ]);

        deepEqual(tokenize('m-abc'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: 'value-delimiter', start: 1, end: 2 },
            { type: 'Literal', value: 'abc', start: 2, end: 5 }
        ]);

        deepEqual(tokenize('m-a0'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: 'value-delimiter', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 },
            { type: 'NumberValue', value: 0, unit: '', start: 3, end: 4 }
        ]);

        deepEqual(tokenize('m-a0-a'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: 'value-delimiter', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 },
            { type: 'NumberValue', value: 0, unit: '', start: 3, end: 4 },
            { type: 'Operator', operator: 'value-delimiter', start: 4, end: 5 },
            { type: 'Literal', value: 'a', start: 5, end: 6 }
        ]);
    });
});
