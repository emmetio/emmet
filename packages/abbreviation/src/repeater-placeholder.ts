import Scanner from '@emmetio/scanner';
import { EMRepeaterPlaceholder } from './ast';
import { Chars } from './utils';

/**
 * Consumes repeater placeholder `$#` from given scanner
 */
export default function repeaterPlaceholder(scanner: Scanner): EMRepeaterPlaceholder | undefined {
    const start = scanner.pos;
    if (scanner.eat(Chars.Dollar) && scanner.eat(Chars.Hash)) {
        return { type: 'EMRepeaterPlaceholder', start, end: scanner.pos };
    }

    scanner.pos = start;
}
