import type { Token, Literal, Bracket, Field, RepeaterPlaceholder, Repeater, RepeaterNumber, ValueToken, Quote, Operator, OperatorType, WhiteSpace } from './tokenizer/tokens';
import type { ConvertState } from './types';

type TokenVisitor = (token: Token, state: ConvertState) => string;

const operators: { [key in OperatorType]: string } = {
    child: '>',
    class: '.',
    climb: '^',
    id: '#',
    equal: '=',
    close: '/',
    sibling: '+'
};

const tokenVisitor: { [name: string]: TokenVisitor } = {
    Literal(token: Literal): string {
        return token.value;
    },
    Quote(token: Quote) {
        return token.single ? '\'' : '"';
    },
    Bracket(token: Bracket): string {
        if (token.context === 'attribute') {
            return token.open ? '[' : ']';
        } else if (token.context === 'expression') {
            return token.open ? '{' : '}';
        } else {
            return token.open ? '(' : '}';
        }
    },
    Operator(token: Operator) {
        return operators[token.operator];
    },
    Field(token: Field, state) {
        if (token.index != null) {
            // It’s a field: by default, return TextMate-compatible field
            return token.name
                ? `\${${token.index}:${token.name}}`
                : `\${${token.index}`;
        } else if (token.name) {
            // It’s a variable
            return state.getVariable(token.name);
        }

        return '';
    },
    RepeaterPlaceholder(token: RepeaterPlaceholder, state) {
        // Find closest implicit repeater
        let repeater: Repeater | undefined;
        for (let i = state.repeaters.length - 1; i >= 0; i--) {
            if (state.repeaters[i]!.implicit) {
                repeater = state.repeaters[i]!;
                break;
            }
        }

        state.inserted = true;
        return state.getText(repeater && repeater.value);
    },
    RepeaterNumber(token: RepeaterNumber, state) {
        let value = 1;
        const lastIx = state.repeaters.length - 1;
        // const repeaterIx = Math.max(0, state.repeaters.length - 1 - token.parent);
        const repeater = state.repeaters[lastIx];
        if (repeater) {
            value = token.reverse
                ? token.base + repeater.count - repeater.value! - 1
                : token.base + repeater.value!;

            if (token.parent) {
                const parentIx = Math.max(0, lastIx - token.parent);
                if (parentIx !== lastIx) {
                    const parentRepeater = state.repeaters[parentIx];
                    value += repeater.count * parentRepeater.value;
                }
            }
        }

        let result = String(value);
        while (result.length < token.size) {
            result = '0' + result;
        }

        return result;
    },
    WhiteSpace(token: WhiteSpace) {
        return token.value;
    }
};

/**
 * Converts given value token to string
 */
export default function stringify(token: ValueToken, state: ConvertState): string {
    if (!tokenVisitor[token.type]) {
        throw new Error(`Unknown token ${token.type}`);
    }
    return tokenVisitor[token.type](token, state);
}
