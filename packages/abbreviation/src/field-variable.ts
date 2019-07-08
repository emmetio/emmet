import Scanner, { isNumber, isAlpha, isAlphaNumericWord } from '@emmetio/scanner';
import { EMField, EMVariable } from './ast';
import { Chars } from './utils';

export default function consumeFieldOrVariable(scanner: Scanner): EMField | EMVariable | undefined {
    const start = scanner.pos;
    if (scanner.eat(Chars.Dollar) && scanner.eat(Chars.ExpressionStart)) {
        // Possible start of field or variable reference
        scanner.start = scanner.pos;

        if (scanner.eat(isAlpha)) {
            // It’s a variable
            scanner.eatWhile(isVariableName);
            if (scanner.peek() === Chars.ExpressionEnd) {
                return {
                    type: 'EMVariable',
                    name: scanner.current(),
                    start,
                    end: ++scanner.pos
                };
            }
        } else if (scanner.eatWhile(isNumber)) {
            // It’s a field
            const index = Number(scanner.current());
            const placeholder = scanner.eat(Chars.Colon) ? consumePlaceholder(scanner) : '';
            if (scanner.eat(Chars.ExpressionEnd)) {
                return {
                    type: 'EMField',
                    index, placeholder,
                    start,
                    end: scanner.pos
                };
            }
        }
    }

    // If we reached here then there’s no valid field here, revert
    // back to starting position
    scanner.pos = start;
}

/**
 * Consumes a placeholder: value right after `:` in field. Could be empty
 */
function consumePlaceholder(stream: Scanner): string {
    const stack: number[] = [];
    stream.start = stream.pos;

    while (!stream.eof()) {
        if (stream.eat(Chars.ExpressionStart)) {
            stack.push(stream.pos);
        } else if (stream.eat(Chars.ExpressionEnd)) {
            if (!stack.length) {
                break;
            }
            stack.pop();
        } else {
            stream.pos++;
        }
    }

    if (stack.length) {
        stream.pos = stack.pop()!;
        throw stream.error(`Unable to find matching "}" for curly brace`);
    }

    return stream.current();
}

function isVariableName(ch: number) {
    return ch === Chars.Dash || isAlphaNumericWord(ch);
}
