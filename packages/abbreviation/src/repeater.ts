import Scanner, { isNumber } from '@emmetio/scanner';
import { EMRepeat } from './ast';
import { Chars } from './utils';

/**
 * Consumes node repeat token from current stream position and returns its
 * parsed value
 */
export default function repeater(scanner: Scanner): EMRepeat | undefined {
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
