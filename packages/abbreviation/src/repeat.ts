import { NodeRepeat } from '@emmetio/node';
import StreamReader from '@emmetio/stream-reader';
import { isNumber } from '@emmetio/stream-reader/utils';

const ASTERISK = 42; // *

/**
 * Consumes node repeat token from current stream position and returns its
 * parsed value
 */
export default function consumeRepeat(stream: StreamReader): NodeRepeat | undefined {
    if (stream.eat(ASTERISK)) {
        stream.start = stream.pos;

        // XXX think about extending repeat syntax with through numbering
        return {
            count: stream.eatWhile(isNumber)
                ? +stream.current()
                : undefined
        };
    }
}
