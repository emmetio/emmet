import tokenize, { AllTokens } from './tokenizer';
import parser, { CSSProperty, ParseOptions } from './parser';

export { tokenize };
export * from './tokenizer/tokens';
export { CSSProperty, CSSValue, ParseOptions, FunctionCall, Value } from './parser';

/**
 * Parses given abbreviation into property set
 */
export default function parse(abbr: string | AllTokens[], options?: ParseOptions): CSSProperty[] {
    if (typeof abbr === 'string') {
        abbr = tokenize(abbr);
    }

    return parser(abbr, options);
}
