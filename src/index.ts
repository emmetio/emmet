import { Abbreviation } from '@emmetio/abbreviation';
import parseMarkup, { stringify as stringifyMarkup } from './markup';
import resolveConfig, { UserConfig, Config } from './config';

export default function expandAbbreviation(abbr: string | Abbreviation, config?: UserConfig): string {
    const resolvedConfig = resolveConfig(config);
    // TODO handle stylesheet abbreviations
    return markup(abbr, resolvedConfig);
}

/**
 * Expands given *markup* abbreviation (e.g. regular Emmet abbreviation that
 * produces structured output like HTML) and outputs it according to options
 * provided in config
 */
export function markup(abbr: string | Abbreviation, config: Config) {
    return stringifyMarkup(parseMarkup(abbr, config), config);
}

export { parseMarkup, stringifyMarkup, resolveConfig };
export * from './config/types';
