import Scanner from '@emmetio/scanner';
import { EMTokenGroup, EMNode } from './ast';
import { tokenAccumulator, Chars, pushString, createGroup, escaped, pushToken } from './utils';
import nextToken, { AllowedTokens } from './next-token';

/**
 * Consumes expression like `{...}` from scanner
 */
export default function expression<T extends EMNode>(scanner: Scanner, tokens: AllowedTokens = AllowedTokens.All): EMTokenGroup<T> | undefined {
    const start = scanner.pos;

    if (scanner.eat(Chars.ExpressionStart)) {
        let token: EMNode | undefined;
        let stack = 1;
        const acc = tokenAccumulator<T>(scanner.pos);

        while (!scanner.eof()) {
            scanner.start = scanner.pos;
            if (scanner.eat(Chars.ExpressionStart)) {
                acc.str += scanner.current();
                stack++;
            } else if (scanner.eat(Chars.ExpressionEnd)) {
                stack--;
                if (!stack) {
                    pushString(acc, scanner.start);
                    scanner.start = start;
                    return createGroup(scanner, acc.tokens, '{', '}');
                } else {
                    acc.str += scanner.current();
                }
            } else if (escaped(scanner)) {
                acc.str += scanner.current();
            } else if (token = nextToken(scanner, tokens)) {
                pushToken(acc, token);
            } else {
                acc.str += scanner.string[scanner.pos++];
            }
        }

        // If we’re here then paired character can’t be consumed
        scanner.pos = start;
        throw scanner.error(`Expecting closing ${String.fromCharCode(Chars.ExpressionEnd)}`);
    }
}
