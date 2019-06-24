import StreamReader from '@emmetio/stream-reader';
import { eatQuoted } from '@emmetio/stream-reader/utils';

const opt = { throws: true };

/**
 * Consumes quoted literal from current stream position and returns it’s inner,
 * unquoted, value
 * @return Returns `undefined` if unable to consume quoted value from current position
 */
export default function consumeQuoted(stream: StreamReader): string | undefined {
    if (eatQuoted(stream, opt)) {
        return stream.current().slice(1, -1);
    }
}
