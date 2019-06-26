import StreamReader from '@emmetio/stream-reader';
import { isAlphaWord } from '@emmetio/stream-reader/utils';
import consumeColor from './color';
import consumeNumericValue from './number';
import consumeArguments, { consumeKeywordOrFunction } from './function';
import { CSSAbbreviation, CSSFunctionArgument, CSSElement, CSSValue, CSSNumber } from './ast';

export * from './ast';

const enum Chars {
    Important = 33, // !
    Dollar = 36, // $
    Plus = 43, // +
    Dash = 45, // -
    Colon = 58, // :
    At = 64, // @
}

/**
 * Parses given Emmet CSS abbreviation and returns it as parsed Node tree
 */
export default function parseAbbreviation(source: string): CSSAbbreviation {
    const stream = new StreamReader(source);
    const result: CSSAbbreviation = {
        type: 'CSSAbbreviation',
        elements: [],
        source
    };

    let name: string | undefined;
    let args: CSSFunctionArgument[] | undefined;

    while (!stream.eof()) {
        const elem: CSSElement = {
            type: 'CSSElement',
            start: stream.start
        };
        name = consumeIdent(stream);
        if (name && (args = consumeArguments(stream))) {
            // Edge case: element is a function call, e.g. `lg(...)`
            elem.value = [{
                type: 'CSSFunction',
                name,
                arguments: args,
                start: elem.start,
                end: stream.pos
            }];
        } else {
            elem.name = name;
            elem.value = consumeValue(stream);
        }

        elem.important = stream.eat(Chars.Important);

        if (!elem.name && !elem.value && !elem.important) {
            throw stream.error('Unexpected character');
        }

        elem.end = stream.pos;
        result.elements.push(elem);

        // CSS abbreviations cannot be nested, only listed
        stream.eat(Chars.Plus);
    }

    return result;
}

/**
 * Consumes CSS property identifier from given stream
 */
function consumeIdent(stream: StreamReader): string | undefined {
    const start = stream.pos;
    if (stream.eat(isAlphaWord) || stream.eatWhile(isIdentPrefix)) {
        stream.eatWhile(isAlphaWord);
        stream.start = start;
        return stream.current();
    }
}

/**
 * Consumes embedded value from Emmet CSS abbreviation stream
 */
function consumeValue(stream: StreamReader): CSSValue[] | undefined {
    const values: CSSValue[] = [];
    let value: CSSValue | undefined;

    while (!stream.eof()) {
        // use colon as value separator
        stream.eat(Chars.Colon);
        if (value = consumeNumericValue(stream) || consumeColor(stream)) {
            // edge case: a dash after unit-less numeric value or color should
            // be treated as value separator, not negative sign
            if (!(value as CSSNumber).unit) {
                stream.eat(Chars.Dash);
            }
        } else {
            stream.eat(Chars.Dash);
            value = consumeKeywordOrFunction(stream, true);
        }

        if (!value) {
            break;
        }

        values.push(value);
    }

    return values.length ? values : void 0;
}

function isIdentPrefix(code: number): boolean {
    return code === Chars.At || code === Chars.Dollar;
}
