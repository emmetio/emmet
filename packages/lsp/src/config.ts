import { markup, resolveConfig, stylesheet, type Config, type UserConfig } from '../../..';
import { EmmetSettings } from './types';
import { getEmmetSyntax } from './language';

/** Emmet’s internal cache object — the type itself is not exported */
type EmmetCache = NonNullable<UserConfig['cache']>;

/**
 * Emmet config for expanding abbreviations in given language, with user
 * preferences applied on top of the server defaults
 */
function getEmmetConfig(languageId: string, settings: EmmetSettings): UserConfig {
    return {
        type: getEmmetSyntax(languageId),
        options: {
            'output.tagCase': '',
            'output.attributeCase': '',
            'output.selfClosingStyle': 'html',
            'output.compactBoolean': false,
            'output.booleanAttributes': [],
            'output.reverseAttributes': false,
            'markup.href': true,
            'comment.enabled': false,
            'comment.trigger': ['id', 'class'],
            ...settings.preferences
        },
        variables: settings.variables ?? {},
        snippets: {}
    };
}

/**
 * Expand an abbreviation with an already resolved config
 */
export function expand(abbreviation: string, config: Config): string {
    return config.type === 'stylesheet'
        ? stylesheet(abbreviation, config)
        : markup(abbreviation, config);
}

/**
 * Keeps resolved Emmet configs around for the editing session.
 *
 * Resolving a config merges the whole default snippet map, and expanding a
 * stylesheet abbreviation additionally converts those snippets into a parsed
 * form — both are wasted work when repeated on every keystroke. Emmet stores the
 * parsed snippets in the `cache` object it’s given, so a single one is shared by
 * every config here.
 */
export class EmmetConfigCache {
    private configs = new WeakMap<EmmetSettings, Map<string, Config>>();
    private snippetCache: EmmetCache = {};

    resolve(languageId: string, settings: EmmetSettings): Config {
        let byLanguage = this.configs.get(settings);
        if (!byLanguage) {
            byLanguage = new Map();
            this.configs.set(settings, byLanguage);
        }

        let config = byLanguage.get(languageId);
        if (!config) {
            config = resolveConfig({
                ...getEmmetConfig(languageId, settings),
                cache: this.snippetCache
            });
            byLanguage.set(languageId, config);
        }

        return config;
    }

    /**
     * Drop everything cached: settings may have been updated in place, and
     * snippets resolved from the previous ones are no longer valid
     */
    clear(): void {
        this.configs = new WeakMap();
        this.snippetCache = {};
    }
}
