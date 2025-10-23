import { ScannerError } from '@emmetio/scanner';
import tokenize, { getToken, type AllTokens } from './tokenizer';
import parser, { type CSSProperty, type ParseOptions } from './parser';

export { tokenize, getToken, parser };
export * from './tokenizer';
export type { CSSProperty, CSSValue, ParseOptions, FunctionCall, Value } from './parser';
export type CSSAbbreviation = CSSProperty[];

/**
 * Parses given abbreviation into property set
 */
export default function parse(abbr: string | AllTokens[], options?: ParseOptions): CSSAbbreviation {
    try {
        const tokens = typeof abbr === 'string' ? tokenize(abbr, options && options.value) : abbr;
        return parser(tokens, options);
    } catch (err) {
        if (err instanceof ScannerError && typeof abbr === 'string') {
            err.message += `\n${abbr}\n${'-'.repeat(err.pos)}^`;
        }

        throw err;
    }
}
