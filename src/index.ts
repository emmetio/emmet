import markupAbbreviation, { Abbreviation } from '@emmetio/abbreviation';
import stylesheetAbbreviation, { CSSAbbreviation } from '@emmetio/css-abbreviation';
import parseMarkup, { stringify as stringifyMarkup } from './markup';
import parseStylesheet, {
    stringify as stringifyStylesheet,
    convertSnippets as parseStylesheetSnippets,
    CSSAbbreviationScope
} from './stylesheet';
import resolveConfig, { UserConfig, Config } from './config';

export default function expandAbbreviation(abbr: string, config?: UserConfig): string {
    const resolvedConfig = resolveConfig(config);
    return resolvedConfig.type === 'stylesheet'
        ? stylesheet(abbr, resolvedConfig)
        : markup(abbr, resolvedConfig);
}

/**
 * Expands given *markup* abbreviation (e.g. regular Emmet abbreviation that
 * produces structured output like HTML) and outputs it according to options
 * provided in config
 */
export function markup(abbr: string | Abbreviation, config: Config) {
    return stringifyMarkup(parseMarkup(abbr, config), config);
}

/**
 * Expands given *stylesheet* abbreviation (a special Emmet abbreviation designed for
 * stylesheet languages like CSS, SASS etc.) and outputs it according to options
 * provided in config
 */
export function stylesheet(abbr: string | CSSAbbreviation, config: Config) {
    return stringifyStylesheet(parseStylesheet(abbr, config), config);
}

export {
    markupAbbreviation, parseMarkup, stringifyMarkup,
    stylesheetAbbreviation, parseStylesheet, stringifyStylesheet, parseStylesheetSnippets,
    Abbreviation as MarkupAbbreviation, CSSAbbreviation as StylesheetAbbreviation,
    CSSAbbreviationScope
};
export { default as extract, ExtractOptions, ExtractedAbbreviation } from './extract-abbreviation';
export { GlobalConfig, SyntaxType, Config, UserConfig, Options, AbbreviationContext, default as resolveConfig } from './config';
