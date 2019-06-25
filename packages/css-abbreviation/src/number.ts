import { isNumber, isAlphaWord } from '@emmetio/stream-reader/utils';
import StreamReader from '@emmetio/stream-reader';
import { CSSNumber } from './ast';

const enum Chars {
    Percent = 37, // %
    Dash = 45, // -
    Dot = 46, // .
}

/**
 * Consumes numeric CSS value (number with optional unit) from current stream,
 * if possible
 */
export default function consumeNumber(stream: StreamReader): CSSNumber | undefined {
    const start = stream.start = stream.pos;
    if (eatNumber(stream)) {
        const value = Number(stream.current());
        stream.start = stream.pos;

        // eat unit, which can be a % or alpha word
        stream.eat(Chars.Percent) || stream.eatWhile(isAlphaWord);
        return {
            type: 'number',
            value,
            unit: stream.current(),
            start,
            end: stream.pos
        };
    }
}

/**
 * Eats number value from given stream
 * @return Returns `true` if number was consumed
 */
function eatNumber(stream: StreamReader): boolean {
    const start = stream.pos;
    stream.eat(Chars.Dash);
    const afterNegative = stream.pos;

    stream.eatWhile(isNumber);

    const prevPos = stream.pos;
    if (stream.eat(Chars.Dot) && !stream.eatWhile(isNumber)) {
        // Number followed by a dot, but then no number
        stream.pos = prevPos;
    }

    // Edge case: consumed dash only: not a number, bail-out
    if (stream.pos === afterNegative) {
        stream.pos = start;
    }

    return stream.pos !== start;
}
