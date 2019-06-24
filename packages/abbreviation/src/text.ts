import StreamReader from '@emmetio/stream-reader';

const TEXT_START = 123; // {
const TEXT_END = 125; // }
const ESCAPE = 92; // \ character

/**
 * Consumes text node `{...}` from stream
 * @return Returns consumed text value (without surrounding braces) or
 * `null` if there’s no text at starting position
 */
export default function consumeText(stream: StreamReader): string | null {
    // NB using own implementation instead of `eatPair()` from @emmetio/stream-reader/utils
    // to disable quoted value consuming
    const start = stream.pos;

    if (stream.eat(TEXT_START)) {
        let stack = 1;
        let ch: number | undefined;
        let result = '';
        let offset = stream.pos;

        while (!stream.eof()) {
            ch = stream.next();
            if (ch === TEXT_START) {
                stack++;
            } else if (ch === TEXT_END) {
                stack--;
                if (!stack) {
                    stream.start = start;
                    return result + stream.substring(offset, stream.pos - 1);
                }
            } else if (ch === ESCAPE) {
                ch = stream.next();
                if (ch === TEXT_START || ch === TEXT_END) {
                    result += stream.substring(offset, stream.pos - 2) + String.fromCharCode(ch);
                    offset = stream.pos;
                }
            }
        }

        // If we’re here then paired character can’t be consumed
        stream.pos = start;
        throw stream.error(`Unable to find closing ${String.fromCharCode(TEXT_END)} for text start`);
    }

    return null;
}
