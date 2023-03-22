import { ScannerError } from '@emmetio/scanner';
import parse, { type TokenGroup } from './parser/index.js';
import tokenize, { getToken, type AllTokens } from './tokenizer/index.js';
import convert from './convert.js';
import type { ParserOptions } from './types.js';

export { parse, tokenize, getToken, convert };
export * from './tokenizer/tokens.js';
export * from './types.js';
export type MarkupAbbreviation = TokenGroup;

/**
 * Parses given abbreviation into node tree
 */
export default function parseAbbreviation(abbr: string | AllTokens[], options?: ParserOptions) {
    try {
        const tokens = typeof abbr === 'string' ? tokenize(abbr) : abbr;
        return convert(parse(tokens, options), options);
    } catch (err) {
        if (err instanceof ScannerError && typeof abbr === 'string') {
            err.message += `\n${abbr}\n${'-'.repeat(err.pos)}^`;
        }

        throw err;
    }
}
