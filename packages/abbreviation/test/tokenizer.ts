import { deepStrictEqual } from 'assert';
import tokenize from '../src/tokenizer';

describe.only('Tokenizer', () => {
    it('basic abbreviations', () => {
        deepStrictEqual(tokenize('ul>li'), [
            { type: 'Literal', value: 'ul', start: 0, end: 2 },
            { type: 'Operator', operator: 'child', start: 2, end: 3 },
            { type: 'Literal', value: 'li', start: 3, end: 5 }
        ]);

        deepStrictEqual(tokenize('ul[title="foo+bar\'str\'" (attr)=bar]{(some > text)}'), [
            { type: 'Literal', value: 'ul', start: 0, end: 2 },
            { type: 'Bracket', open: true, context: 'attribute', start: 2, end: 3 },
            { type: 'Literal', value: 'title', start: 3, end: 8 },
            { type: 'Operator', operator: 'equal', start: 8, end: 9 },
            { type: 'Quote', single: false, start: 9, end: 10 },
            { type: 'Literal', value: 'foo+bar\'str\'', start: 10, end: 22 },
            { type: 'Quote', single: false, start: 22, end: 23 },
            { type: 'WhiteSpace', start: 23, end: 24 },
            { type: 'Bracket', open: true, context: 'group', start: 24, end: 25 },
            { type: 'Literal', value: 'attr', start: 25, end: 29 },
            { type: 'Bracket', open: false, context: 'group', start: 29, end: 30 },
            { type: 'Operator', operator: 'equal', start: 30, end: 31 },
            { type: 'Literal', value: 'bar', start: 31, end: 34 },
            { type: 'Bracket', open: false, context: 'attribute', start: 34, end: 35 },
            { type: 'Bracket', open: true, context: 'expression', start: 35, end: 36 },
            { type: 'Bracket', open: true, context: 'group', start: 36, end: 37 },
            { type: 'Literal', value: 'some > text', start: 37, end: 48 },
            { type: 'Bracket', open: false, context: 'group', start: 48, end: 49 },
            { type: 'Bracket', open: false, context: 'expression', start: 49, end: 50 }
        ]);

        deepStrictEqual(tokenize('h${some${1:field placeholder}}'), [{ type: 'Literal', value: 'h', start: 0, end: 1 },
            { type: 'RepeaterNumber', size: 1, reverse: false, base: 1, start: 1, end: 2 },
            { type: 'Bracket', open: true, context: 'expression', start: 2, end: 3 },
            { type: 'Literal', value: 'some', start: 3, end: 7 },
            { type: 'Field', index: 1, name: 'field placeholder', start: 7, end: 29 },
            { type: 'Bracket', open: false, context: 'expression', start: 29, end: 30 }
        ]);
    });
});
