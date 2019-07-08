import { strictEqual, deepStrictEqual } from 'assert';
import Scanner from '@emmetio/scanner';
import quoted from '../src/quoted';
import unquoted, { AllowedChars } from '../src/unquoted';
import expression from '../src/expression';
import { EMString, EMNode, EMTokenGroup, EMField, EMVariable, EMRepeaterValue } from '../src/ast';
import { AllowedTokens } from '../src/next-token';

const s = (text: string) => new Scanner(text);
const range = (node: EMNode) => [node.start, node.end];
const wrap = (node: EMTokenGroup) => [node.before, node.after];

describe('String consumers', () => {
    describe('Quoted', () => {
        it('basic consumer', () => {
            let group = quoted(s('"foo"'))!;
            strictEqual(group.tokens.length, 1);
            deepStrictEqual(range(group), [0, 5]);
            deepStrictEqual(wrap(group), ['"', '"']);

            const token1 = group.tokens[0] as EMString;
            strictEqual(token1.type, 'EMString');
            strictEqual(token1.value, 'foo');
            deepStrictEqual(range(token1), [1, 4]);

            group = quoted(s('\'foo${0}${bar}$$$baz\''), AllowedTokens.FieldOrVariable | AllowedTokens.Numbering)!;
            strictEqual(group.tokens.length, 5);
            deepStrictEqual(range(group), [0, 21]);

            const token2 = group.tokens[0] as EMString;
            strictEqual(token2.type, 'EMString');
            strictEqual(token2.value, 'foo');
            deepStrictEqual(range(token2), [1, 4]);

            const token3 = group.tokens[1] as EMField;
            strictEqual(token3.type, 'EMField');
            strictEqual(token3.index, 0);
            strictEqual(token3.placeholder, '');
            deepStrictEqual(range(token3), [4, 8]);

            const token4 = group.tokens[2] as EMVariable;
            strictEqual(token4.type, 'EMVariable');
            strictEqual(token4.name, 'bar');
            deepStrictEqual(range(token4), [8, 14]);

            const token5 = group.tokens[3] as EMRepeaterValue;
            strictEqual(token5.type, 'EMRepeaterValue');
            strictEqual(token5.size, 3);
            strictEqual(token5.base, 1);
            strictEqual(token5.reverse, false);
            deepStrictEqual(range(token5), [14, 17]);

            const token6 = group.tokens[4] as EMString;
            strictEqual(token6.type, 'EMString');
            strictEqual(token6.value, 'baz');
            deepStrictEqual(range(token6), [17, 20]);
        });

        it('consume escaped', () => {
            const group = quoted(s('"foo\\$${bar}"'), AllowedTokens.Numbering)!;
            strictEqual(group.tokens.length, 3);

            const token1 = group.tokens[0] as EMString;
            strictEqual(token1.type, 'EMString');
            strictEqual(token1.value, 'foo$');
            deepStrictEqual(range(token1), [1, 6]);

            const token2 = group.tokens[1] as EMRepeaterValue;
            strictEqual(token2.type, 'EMRepeaterValue');
            strictEqual(token2.size, 1);
            strictEqual(token2.base, 1);
            strictEqual(token2.reverse, false);
            deepStrictEqual(range(token2), [6, 7]);

            const token3 = group.tokens[2] as EMString;
            strictEqual(token3.type, 'EMString');
            strictEqual(token3.value, '{bar}');
            deepStrictEqual(range(token3), [7, 12]);
        });
    });

    describe('Expression', () => {
        it('basic', () => {
            let group = expression(s('{foo bar}'))!;
            strictEqual(group.tokens.length, 1);
            deepStrictEqual(range(group), [0, 9]);
            deepStrictEqual(wrap(group), ['{', '}']);
            deepStrictEqual((group.tokens[0] as EMString).value, 'foo bar');
            deepStrictEqual(range(group.tokens[0]), [1, 8]);

            group = expression(s('{foo ${0}${bar}$$$ baz}'), AllowedTokens.FieldOrVariable | AllowedTokens.Numbering)!;
            const token1 = group.tokens[0] as EMString;
            strictEqual(token1.type, 'EMString');
            strictEqual(token1.value, 'foo ');
            deepStrictEqual(range(token1), [1, 5]);

            const token2 = group.tokens[1] as EMField;
            strictEqual(token2.type, 'EMField');
            strictEqual(token2.index, 0);
            strictEqual(token2.placeholder, '');
            deepStrictEqual(range(token2), [5, 9]);

            const token3 = group.tokens[2] as EMVariable;
            strictEqual(token3.type, 'EMVariable');
            strictEqual(token3.name, 'bar');
            deepStrictEqual(range(token3), [9, 15]);

            const token4 = group.tokens[3] as EMRepeaterValue;
            strictEqual(token4.type, 'EMRepeaterValue');
            strictEqual(token4.size, 3);
            strictEqual(token4.base, 1);
            strictEqual(token4.reverse, false);
            deepStrictEqual(range(token4), [15, 18]);

            const token5 = group.tokens[4] as EMString;
            strictEqual(token5.type, 'EMString');
            strictEqual(token5.value, ' baz');
            deepStrictEqual(range(token5), [18, 22]);
        });

        it('consume escaped', () => {
            const group = expression(s('{foo\\}${bar}}'), AllowedTokens.Numbering)!;
            strictEqual(group.tokens.length, 3);

            const token1 = group.tokens[0] as EMString;
            strictEqual(token1.type, 'EMString');
            strictEqual(token1.value, 'foo}');
            deepStrictEqual(range(token1), [1, 6]);

            const token2 = group.tokens[1] as EMRepeaterValue;
            strictEqual(token2.type, 'EMRepeaterValue');
            strictEqual(token2.size, 1);
            strictEqual(token2.base, 1);
            strictEqual(token2.reverse, false);
            deepStrictEqual(range(token2), [6, 7]);

            const token3 = group.tokens[2] as EMString;
            strictEqual(token3.type, 'EMString');
            strictEqual(token3.value, '{bar}');
            deepStrictEqual(range(token3), [7, 12]);
        });
    });

    describe('Unquoted', () => {
        it('basic', () => {
            let group = unquoted(s('foo[bar]'))!;
            strictEqual(group.tokens.length, 1);
            deepStrictEqual(range(group), [0, 3]);

            const token1 = group.tokens[0] as EMString;
            strictEqual(token1.type, 'EMString');
            strictEqual(token1.value, 'foo');
            deepStrictEqual(range(token1), [0, 3]);

            group = unquoted(s('foo[bar]'), AllowedChars.Square)!;
            strictEqual(group.tokens.length, 1);
            deepStrictEqual(range(group), [0, 8]);

            const token2 = group.tokens[0] as EMString;
            strictEqual(token2.type, 'EMString');
            strictEqual(token2.value, 'foo[bar]');
            deepStrictEqual(range(token2), [0, 8]);

            group = unquoted(s('foo[bar$]'), AllowedChars.Square, AllowedTokens.Numbering)!;
            strictEqual(group.tokens.length, 3);
            deepStrictEqual(range(group), [0, 9]);

            const token3 = group.tokens[0] as EMString;
            strictEqual(token3.type, 'EMString');
            strictEqual(token3.value, 'foo[bar');
            deepStrictEqual(range(token3), [0, 7]);

            const token4 = group.tokens[1] as EMRepeaterValue;
            strictEqual(token4.type, 'EMRepeaterValue');
            strictEqual(token4.size, 1);
            strictEqual(token4.base, 1);
            strictEqual(token4.reverse, false);
            deepStrictEqual(range(token4), [7, 8]);

            const token5 = group.tokens[2] as EMString;
            strictEqual(token5.type, 'EMString');
            strictEqual(token5.value, ']');
            deepStrictEqual(range(token5), [8, 9]);
        });

        it('consume escaped', () => {
            const group = unquoted(s('(foo\\)${bar})'), AllowedChars.Round, AllowedTokens.Numbering)!;
            strictEqual(group.tokens.length, 3);

            const token1 = group.tokens[0] as EMString;
            strictEqual(token1.type, 'EMString');
            strictEqual(token1.value, '(foo)');
            deepStrictEqual(range(token1), [0, 6]);

            const token2 = group.tokens[1] as EMRepeaterValue;
            strictEqual(token2.type, 'EMRepeaterValue');
            strictEqual(token2.size, 1);
            strictEqual(token2.base, 1);
            strictEqual(token2.reverse, false);
            deepStrictEqual(range(token2), [6, 7]);

            const token3 = group.tokens[2] as EMString;
            strictEqual(token3.type, 'EMString');
            strictEqual(token3.value, '{bar})');
            deepStrictEqual(range(token3), [7, 13]);
        });
    });
});
