import { deepStrictEqual as deepEqual } from 'assert';
import tokenize from '../src/tokenizer/index.js';

describe('Tokenizer', () => {
    it('numeric values', () => {
        deepEqual(tokenize('p10'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 10, rawValue: '10', unit: '', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('p-10'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: '', start: 1, end: 4 }
        ]);

        deepEqual(tokenize('p-10-'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: '-', start: 4, end: 5 }
        ]);

        deepEqual(tokenize('p-10-20'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: '-', start: 4, end: 5 },
            { type: 'NumberValue', value: 20, rawValue: '20', unit: '', start: 5, end: 7 }
        ]);

        deepEqual(tokenize('p-10--20'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: '-', start: 4, end: 5 },
            { type: 'NumberValue', value: -20, rawValue: '-20', unit: '', start: 5, end: 8 }
        ]);

        deepEqual(tokenize('p-10-20--30'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: '', start: 1, end: 4 },
            { type: 'Operator', operator: '-', start: 4, end: 5 },
            { type: 'NumberValue', value: 20, rawValue: '20', unit: '', start: 5, end: 7 },
            { type: 'Operator', operator: '-', start: 7, end: 8 },
            { type: 'NumberValue', value: -30, rawValue: '-30', unit: '', start: 8, end: 11 }
        ]);

        deepEqual(tokenize('p-10p-20--30'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: 'p', start: 1, end: 5 },
            { type: 'NumberValue', value: -20, rawValue: '-20', unit: '', start: 5, end: 8 },
            { type: 'Operator', operator: '-', start: 8, end: 9 },
            { type: 'NumberValue', value: -30, rawValue: '-30', unit: '', start: 9, end: 12 }
        ]);

        deepEqual(tokenize('p-10%-20--30'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -10, rawValue: '-10', unit: '%', start: 1, end: 5 },
            { type: 'NumberValue', value: -20, rawValue: '-20', unit: '', start: 5, end: 8 },
            { type: 'Operator', operator: '-', start: 8, end: 9 },
            { type: 'NumberValue', value: -30, rawValue: '-30', unit: '', start: 9, end: 12 }
        ]);
    });

    it('float values', () => {
        deepEqual(tokenize('p.5'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.5, rawValue: '.5', unit: '', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('p-.5'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: -0.5, rawValue: '-.5', unit: '', start: 1, end: 4 }
        ]);

        deepEqual(tokenize('p.1.2.3'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.1, rawValue: '.1', unit: '', start: 1, end: 3 },
            { type: 'NumberValue', value: 0.2, rawValue: '.2', unit: '', start: 3, end: 5 },
            { type: 'NumberValue', value: 0.3, rawValue: '.3', unit: '', start: 5, end: 7 }
        ]);

        deepEqual(tokenize('p.1-.2.3'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.1, rawValue: '.1', unit: '', start: 1, end: 3 },
            { type: 'Operator', operator: '-', start: 3, end: 4 },
            { type: 'NumberValue', value: 0.2, rawValue: '.2', unit: '', start: 4, end: 6 },
            { type: 'NumberValue', value: 0.3, rawValue: '.3', unit: '', start: 6, end: 8 }
        ]);

        deepEqual(tokenize('p.1--.2.3'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0.1, rawValue: '.1', unit: '', start: 1, end: 3 },
            { type: 'Operator', operator: '-', start: 3, end: 4 },
            { type: 'NumberValue', value: -0.2, rawValue: '-.2', unit: '', start: 4, end: 7 },
            { type: 'NumberValue', value: 0.3, rawValue: '.3', unit: '', start: 7, end: 9 }
        ]);

        deepEqual(tokenize('10'), [
            { type: 'NumberValue', value: 10, rawValue: '10', unit: '', start: 0, end: 2 },
        ]);

        deepEqual(tokenize('.1'), [
            { type: 'NumberValue', value: 0.1, rawValue: '.1', unit: '', start: 0, end: 2 },
        ]);

        // NB: now dot should be a part of literal
        // throws(() => tokenize('.foo'), /Unexpected character at 1/);
    });

    it('color values', () => {
        deepEqual(tokenize('c#'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 0, g: 0, b: 0, a: 1, raw: '', start: 1, end: 2 }
        ]);

        deepEqual(tokenize('c#1'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 17, g: 17, b: 17, a: 1, raw: '1', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('c#.'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 0, g: 0, b: 0, a: 1, raw: '.', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('c#f'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 255, g: 255, b: 255, a: 1, raw: 'f', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('c#a#b#c'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 170, g: 170, b: 170, a: 1, raw: 'a', start: 1, end: 3 },
            { type: 'ColorValue', r: 187, g: 187, b: 187, a: 1, raw: 'b', start: 3, end: 5 },
            { type: 'ColorValue', r: 204, g: 204, b: 204, a: 1, raw: 'c', start: 5, end: 7 }
        ]);

        deepEqual(tokenize('c#af'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 175, g: 175, b: 175, a: 1, raw: 'af', start: 1, end: 4 }
        ]);

        deepEqual(tokenize('c#fc0'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 255, g: 204, b: 0, a: 1, raw: 'fc0', start: 1, end: 5 }
        ]);

        deepEqual(tokenize('c#11.5'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 17, g: 17, b: 17, a: 0.5, raw: '11.5', start: 1, end: 6 }
        ]);

        deepEqual(tokenize('c#.99'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 0, g: 0, b: 0, a: 0.99, raw: '.99', start: 1, end: 5 }
        ]);

        deepEqual(tokenize('c#t'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'ColorValue', r: 0, g: 0, b: 0, a: 0, raw: 't', start: 1, end: 3 }
        ]);

        deepEqual(tokenize('c#${fff}'), [
            { type: 'Literal', value: 'c', start: 0, end: 1 },
            { type: 'Literal', value: '#', start: 1, end: 2 },
            { type: 'Field', index: undefined, name: 'fff', start: 2, end: 8 }
        ]);
    });

    it('keywords', () => {
        deepEqual(tokenize('m:a'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: ':', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 }
        ]);

        deepEqual(tokenize('m-a'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: '-', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 }
        ]);

        deepEqual(tokenize('m-abc'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: '-', start: 1, end: 2 },
            { type: 'Literal', value: 'abc', start: 2, end: 5 }
        ]);

        deepEqual(tokenize('m-a0'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: '-', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 3, end: 4 }
        ]);

        deepEqual(tokenize('m-a0-a'), [
            { type: 'Literal', value: 'm', start: 0, end: 1 },
            { type: 'Operator', operator: '-', start: 1, end: 2 },
            { type: 'Literal', value: 'a', start: 2, end: 3 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 3, end: 4 },
            { type: 'Operator', operator: '-', start: 4, end: 5 },
            { type: 'Literal', value: 'a', start: 5, end: 6 }
        ]);
    });

    it('arguments', () => {
        deepEqual(tokenize('lg(top, "red, black", rgb(0, 0, 0) 10%)'), [
            { type: 'Literal', value: 'lg', start: 0, end: 2 },
            { type: 'Bracket', open: true, start: 2, end: 3 },
            { type: 'Literal', value: 'top', start: 3, end: 6 },
            { type: 'Operator', operator: ',', start: 6, end: 7 },
            { type: 'WhiteSpace', start: 7, end: 8 },
            { type: 'StringValue', value: 'red, black', quote: 'double', start: 8, end: 20 },
            { type: 'Operator', operator: ',', start: 20, end: 21 },
            { type: 'WhiteSpace', start: 21, end: 22 },
            { type: 'Literal', value: 'rgb', start: 22, end: 25 },
            { type: 'Bracket', open: true, start: 25, end: 26 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 26, end: 27 },
            { type: 'Operator', operator: ',', start: 27, end: 28 },
            { type: 'WhiteSpace', start: 28, end: 29 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 29, end: 30 },
            { type: 'Operator', operator: ',', start: 30, end: 31 },
            { type: 'WhiteSpace', start: 31, end: 32 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 32, end: 33 },
            { type: 'Bracket', open: false, start: 33, end: 34 },
            { type: 'WhiteSpace', start: 34, end: 35 },
            { type: 'NumberValue', value: 10, rawValue: '10', unit: '%', start: 35, end: 38 },
            { type: 'Bracket', open: false, start: 38, end: 39 }
        ]);
    });

    it('important', () => {
        deepEqual(tokenize('!'), [
            { type: 'Operator', operator: '!', start: 0, end: 1 }
        ]);

        deepEqual(tokenize('p!'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'Operator', operator: '!', start: 1, end: 2 }
        ]);

        deepEqual(tokenize('p10!'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 10, rawValue: '10', unit: '', start: 1, end: 3 },
            { type: 'Operator', operator: '!', start: 3, end: 4 }
        ]);
    });

    it('mixed', () => {
        deepEqual(tokenize('bd1-s#fc0'), [
            { type: 'Literal', value: 'bd', start: 0, end: 2 },
            { type: 'NumberValue', value: 1, rawValue: '1', unit: '', start: 2, end: 3 },
            { type: 'Operator', operator: '-', start: 3, end: 4 },
            { type: 'Literal', value: 's', start: 4, end: 5 },
            { type: 'ColorValue', r: 255, g: 204, b: 0, a: 1, raw: 'fc0', start: 5, end: 9 }
        ]);

        deepEqual(tokenize('bd#fc0-1'), [
            { type: 'Literal', value: 'bd', start: 0, end: 2 },
            { type: 'ColorValue', r: 255, g: 204, b: 0, a: 1, raw: 'fc0', start: 2, end: 6 },
            { type: 'Operator', operator: '-', start: 6, end: 7 },
            { type: 'NumberValue', value: 1, rawValue: '1', unit: '', start: 7, end: 8 }
        ]);

        deepEqual(tokenize('p0+m0'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 1, end: 2 },
            { type: 'Operator', operator: '+', start: 2, end: 3 },
            { type: 'Literal', value: 'm', start: 3, end: 4 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 4, end: 5 }
        ]);

        deepEqual(tokenize('p0!+m0!'), [
            { type: 'Literal', value: 'p', start: 0, end: 1 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 1, end: 2 },
            { type: 'Operator', operator: '!', start: 2, end: 3 },
            { type: 'Operator', operator: '+', start: 3, end: 4 },
            { type: 'Literal', value: 'm', start: 4, end: 5 },
            { type: 'NumberValue', value: 0, rawValue: '0', unit: '', start: 5, end: 6 },
            { type: 'Operator', operator: '!', start: 6, end: 7 }
        ]);

        deepEqual(tokenize('${2:0}%'), [
            { type: 'Field', index: 2, name: '0', start: 0, end: 6 },
            { type: 'Literal', value: '%', start: 6, end: 7 }
        ]);

        deepEqual(tokenize('.${1:5}'), [
            { type: 'Literal', value: '.', start: 0, end: 1 },
            { type: 'Field', index: 1, name: '5', start: 1, end: 7 },
        ]);
    });

    it('embedded variables', () => {
        deepEqual(tokenize('foo$bar'), [
            { type: 'Literal', value: 'foo', start: 0, end: 3 },
            { type: 'Literal', value: '$bar', start: 3, end: 7 }
        ]);

        deepEqual(tokenize('foo$bar-2'), [
            { type: 'Literal', value: 'foo', start: 0, end: 3 },
            { type: 'Literal', value: '$bar-2', start: 3, end: 9 }
        ]);

        deepEqual(tokenize('foo$bar@bam'), [
            { type: 'Literal', value: 'foo', start: 0, end: 3 },
            { type: 'Literal', value: '$bar', start: 3, end: 7 },
            { type: 'Literal', value: '@bam', start: 7, end: 11 }
        ]);

        deepEqual(tokenize('@k10'), [
            { type: 'Literal', value: '@k', start: 0, end: 2 },
            { type: 'NumberValue', value: 10, rawValue: '10', unit: '', start: 2, end: 4 }
        ]);
    });
});
