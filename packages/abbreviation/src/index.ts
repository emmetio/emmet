import parse from './parser';
import tokenize from './tokenizer';
import convert from './convert';
import { ParserOptions } from './types';

export { parse, tokenize, convert };
export * from './tokenizer/tokens';
export * from './types';

/**
 * Parses given abbreviation into node tree
 */
export default function parseAbbreviation(abbr: string, options?: ParserOptions) {
    return convert(parse(tokenize(abbr)), options);
}
