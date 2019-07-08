import Scanner, { isQuote } from '@emmetio/scanner';
import { EMNode, EMTokenGroup } from './ast';
import { tokenAccumulator, pushString, createGroup, escaped, pushToken } from './utils';
import nextToken, { AllowedTokens } from './next-token';

/**
 * Consumes quoted string from given scanner
 */
export default function quoted<T extends EMNode>(scanner: Scanner, tokens: AllowedTokens = AllowedTokens.All): EMTokenGroup<T> | undefined {
    const start = scanner.pos;
    const quote = scanner.peek();

    if (isQuote(quote)) {
        let token: EMNode | undefined;
        const quoteStr = scanner.string[scanner.pos++];
        const acc = tokenAccumulator<T>(scanner.pos);

        while (!scanner.eof()) {
            scanner.start = scanner.pos;
            if (scanner.eat(quote)) {
                // Consumed string end, finalize token
                pushString(acc, scanner.start);
                scanner.start = start;
                return createGroup(scanner, acc.tokens, quoteStr, quoteStr);
            } else if (escaped(scanner)) {
                acc.str += scanner.current();
            } else if (token = nextToken(scanner, tokens)) {
                pushToken(acc, token);
            } else {
                acc.str += scanner.string[scanner.pos++];
            }
        }

        throw scanner.error(`Expecting closing ${quoteStr} quote`);
    }
}
