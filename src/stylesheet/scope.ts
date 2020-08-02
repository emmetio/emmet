export const enum CSSAbbreviationScope {
    /** Include all possible snippets in match */
    Global = '@@global',
    /** Include raw snippets only (e.g. no properties) in abbreviation match */
    Section = '@@section',
    /** Include properties only in abbreviation match */
    Property = '@@property',
    /** Resolve abbreviation in context of CSS property value */
    Value = '@@value',
}
