import Scanner from '@emmetio/scanner';
import { isNumber } from '@emmetio/scanner/utils';
import { EMRepeat } from './ast';
import { Chars } from './utils';

/**
 * Consumes node repeat token from current stream position and returns its
 * parsed value
 */
export default function consumeRepeat(scanner: Scanner): EMRepeat | undefined {
    const start = scanner.pos;
    if (scanner.eat(Chars.Repeater)) {
        scanner.start = scanner.pos;
        let count = 1;
        let implicit = false;

        if (scanner.eatWhile(isNumber)) {
            count = Number(scanner.current());
        } else {
            implicit = true;
        }

        return {
            type: 'EMRepeat',
            count,
            value: 0,
            implicit,
            start,
            end: scanner.pos
        };
    }
}
