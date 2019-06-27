import Scanner from '@emmetio/scanner';
import { isWhiteSpace } from '@emmetio/scanner/utils';
import consumeNumber from './number';
import consumeColor from './color';
import consumeKeyword from './keyword';
import consumeString from './string';
import { CSSFunctionArgument, CSSValue, CSSKeyword, CSSFunction } from './ast';

const enum Chars {
    LBrace = 40, // (
    RBrace = 41, // )
    Comma = 44, // ,
}

/**
 * Consumes arguments from given string.
 * Arguments are comma-separated list of CSS values inside round braces, e.g.
 * `(1, a2, 'a3')`. Nested lists and quoted strings are supported
 * @return Array of arguments, `null` if arguments cannot be consumed
 */
export default function consumeArgumentList(stream: Scanner): CSSFunctionArgument[] | undefined {
    if (!stream.eat(Chars.LBrace)) {
        // not an argument list
        return void 0;
    }

    let arg: CSSFunctionArgument | undefined;
    const argsList: CSSFunctionArgument[] = [];

    while (!stream.eof()) {
        if (arg = consumeArgument(stream)) {
            argsList.push(arg);
        } else {
            // didn’t consumed argument, expect argument separator or end-of-arguments
            stream.eatWhile(isWhiteSpace);

            if (stream.eat(Chars.RBrace)) {
                // end of arguments list
                break;
            }

            if (!stream.eat(Chars.Comma)) {
                throw stream.error('Expected , or )');
            }
        }
    }

    return argsList;
}

/**
 * Consumes a single argument. An argument is a `CSSValue`, e.g. it could be
 * a space-separated string of value
 */
function consumeArgument(stream: Scanner): CSSFunctionArgument | undefined {
    let value: CSSValue | undefined;
    const items: CSSValue[] = [];

    while (!stream.eof()) {
        stream.eatWhile(isWhiteSpace);
        value = consumeNumber(stream) || consumeColor(stream)
            || consumeString(stream) || consumeKeywordOrFunction(stream);

        if (!value) {
            break;
        }

        items.push(value);
    }

    if (items.length) {
        return {
            type: 'CSSFunctionArgument',
            items,
            start: items[0].start,
            end: items[items.length - 1].end
        };
    }
}

/**
 * Consumes either function call like `foo()` or keyword like `foo`
 */
export function consumeKeywordOrFunction(stream: Scanner, short?: boolean): CSSKeyword | CSSFunction | undefined {
    const kw = consumeKeyword(stream, short);
    if (kw) {
        const args = consumeArgumentList(stream);
        if (args) {
            return {
                type: 'CSSFunction',
                arguments: args,
                name: kw.value,
                start: kw.start,
                end: stream.pos
            };
        }

        return kw;
    }
}
