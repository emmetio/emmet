import StreamReader from '@emmetio/stream-reader';
import { isNumber } from '@emmetio/stream-reader/utils';
import { EMRepeat } from './ast';
import { Chars } from './utils';

/**
 * Consumes node repeat token from current stream position and returns its
 * parsed value
 */
export default function consumeRepeat(stream: StreamReader): EMRepeat | undefined {
    if (stream.eat(Chars.Repeater)) {
        stream.start = stream.pos;

        // XXX think about extending repeat syntax with through numbering
        return {
            count: stream.eatWhile(isNumber)
                ? +stream.current()
                : undefined
        };
    }
}
