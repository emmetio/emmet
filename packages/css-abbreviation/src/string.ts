import Scanner from '@emmetio/scanner';
import { eatQuoted } from '@emmetio/scanner/utils';
import { CSSString } from './ast';

/**
 * Consumes 'single' or "double"-quoted string from given string, if possible
 */
export default function consumeString(stream: Scanner): CSSString | undefined {
    if (eatQuoted(stream, { throws: true })) {
        return {
            type: 'CSSString',
            value: stream.current(),
            start: stream.start,
            end: stream.pos
        };
    }
}
