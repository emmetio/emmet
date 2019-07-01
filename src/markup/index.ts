import abbreviation, { EMAbbreviation } from '@emmetio/abbreviation';
import { walk } from './walk';
import { ResolvedConfig } from '../types';
import unroll from './unroll';
import attributes from './attributes';

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export function parse(abbr: string | EMAbbreviation, config: ResolvedConfig): EMAbbreviation {
    if (typeof abbr === 'string') {
        abbr = abbreviation(abbr);
    }

    return transform(abbr, config);

    // return parseAbbreviation(abbr)
    //     .use(resolveSnippets, config.snippets)
    //     .use(resolveVariables, config.variables)
    //     .use(transformHTML, config.text, config.options);
}

/**
 * Rewrites given abbreviation, prepares it for output
 */
export function transform(abbr: EMAbbreviation, config: ResolvedConfig): EMAbbreviation {
    walk(abbr, unroll, config);
    walk(abbr, attributes, config);
    return abbr;
}
