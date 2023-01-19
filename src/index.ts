import markupAbbreviation, { type Abbreviation } from '@emmetio/abbreviation';
import stylesheetAbbreviation, { type CSSAbbreviation } from '@emmetio/css-abbreviation';
import parseMarkup, { stringify as stringifyMarkup } from './markup/index.js';
import parseStylesheet, {
    stringify as stringifyStylesheet,
    convertSnippets as parseStylesheetSnippets,
    CSSAbbreviationScope
} from './stylesheet/index.js';
import resolveConfig, { type UserConfig, type Config } from './config.js';

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
    CSSAbbreviationScope
};
export type {
    Abbreviation as MarkupAbbreviation, CSSAbbreviation as StylesheetAbbreviation,
};
export { default as extract, type ExtractOptions, type ExtractedAbbreviation } from './extract-abbreviation/index.js';
export { default as resolveConfig } from './config.js';
export type { GlobalConfig, SyntaxType, Config, UserConfig, Options, AbbreviationContext} from './config.js';
