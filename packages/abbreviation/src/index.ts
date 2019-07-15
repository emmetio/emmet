import parse from './parser';
import tokenize from './tokenizer';

export { parse, tokenize };
export * from './tokenizer/tokens';

export default function parseAbbreviation(abbr: string) {
    return parse(tokenize(abbr));
}
