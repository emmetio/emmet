import Scanner from '@emmetio/scanner';
import { isNumber } from '@emmetio/scanner/utils';
import { EMRepeat } from './ast';
import { Chars } from './utils';

/**
 * Consumes node repeat token from current stream position and returns its
 * parsed value
 */
export default function consumeRepeat(stream: Scanner): EMRepeat | undefined {
    if (stream.eat(Chars.Repeater)) {
        stream.start = stream.pos;
        let reverse = false;
        let base: number | undefined;

        if (stream.eat(Chars.RepeaterModifier)) {
            reverse = stream.eat(Chars.Dash);
            base = consumeNumber(stream);
        }

        return {
            count: consumeNumber(stream),
            values: [],
            reverse,
            base
        };
    }
}

function consumeNumber(stream: Scanner): number | undefined {
    return stream.eatWhile(isNumber) ? +stream.current() : undefined;
}
