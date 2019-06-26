import StreamReader from '@emmetio/stream-reader';
import { eatQuoted } from '@emmetio/stream-reader/utils';
import { CSSString } from './ast';

/**
 * Consumes 'single' or "double"-quoted string from given string, if possible
 */
export default function consumeString(stream: StreamReader): CSSString | undefined {
    if (eatQuoted(stream, { throws: true })) {
        return {
            type: 'CSSString',
            value: stream.current(),
            start: stream.start,
            end: stream.pos
        };
    }
}
