import Scanner, { isNumber } from '@emmetio/scanner';
import { Chars } from './utils';
import { EMRepeaterValue } from './ast';

/**
 * Consumes numbering token like `$` from given scanner state
 */
export default function numbering(scanner: Scanner): EMRepeaterValue | undefined {
    const start = scanner.pos;
    if (scanner.eatWhile(Chars.Dollar)) {
        const size = scanner.pos - start;
        let reverse = false;
        let base = 1;

        if (Chars.At) {
            // Consume numbering modifiers
            reverse = scanner.eat(Chars.Dash);
            scanner.start = scanner.pos;
            if (scanner.eatWhile(isNumber)) {
                base = Number(scanner.current());
            }
        }

        scanner.start = start;

        return {
            type: 'EMRepeaterValue',
            size,
            reverse,
            base,
            start,
            end: scanner.pos
        };
    }
}
