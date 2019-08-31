import { Abbreviation } from '@emmetio/abbreviation';
import { CSSAbbreviation } from '@emmetio/css-abbreviation';
import parseMarkup, { stringify as stringifyMarkup } from './markup';
import parseStylesheet, {
    stringify as stringifyStylesheet,
    convertSnippets as parseStylesheetSnippets
} from './stylesheet';
import resolveConfig, { UserConfig, Config } from './config';
import { CSSSnippet } from './stylesheet/snippets';

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
export function stylesheet(abbr: string | CSSAbbreviation, config: Config, snippets?: CSSSnippet[]) {
    return stringifyStylesheet(parseStylesheet(abbr, config, snippets), config);
}

export { parseMarkup, stringifyMarkup, parseStylesheet, stringifyStylesheet, parseStylesheetSnippets };
export { default as extract, ExtractOptions, ExtractedAbbreviation } from './extract-abbreviation';
export { GlobalConfig, SyntaxType, Config, UserConfig, Options, default as resolveConfig } from './config';
