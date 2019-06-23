import { RawConfig, ConfigParams, SyntaxType, ResolvedConfig } from './types';

export * from './types';

export const defaultSyntaxes = {
    markup: 'html',
    stylesheet: 'css'
};

export const knownSyntaxes = {
    markup: ['html', 'xml', 'xsl', 'jsx', 'js', 'pug', 'slim', 'haml'],
    stylesheet: ['css', 'sass', 'scss', 'less', 'sss', 'stylus']
};

/**
 * Config resolver: returns compiled config that can be used in
 * `@emmetio/expand-abbreviation` module for expanding abbreviations
 * @param config Config object
 * @param params Additional params like `.syntax` and `.project` for
 * config resolving
 */
export default function createConfig(config: RawConfig, params: Partial<ConfigParams> = {}): ResolvedConfig {
    const { type, syntax, project } = createParams(config, params);
    return resolveConfig(config, type, syntax, project);
}

/**
 * Resolves config for markup syntax
 */
function resolveConfig(config: RawConfig, type: SyntaxType, syntax: string, project?: string): ResolvedConfig {
    return {
        syntax,
        type,
        project,
        profile: mergeConfig(config, 'profile', type, syntax, project),
        options: mergeConfig(config, 'options', type, syntax, project),
        variables: mergeConfig(config, 'variables', type, syntax, project),
        snippets: mergeConfig(config, 'snippets', type, syntax, project)
    };
}

/**
 * Resolves input config params
 */
function createParams(config: RawConfig, params: Partial<ConfigParams>): ConfigParams {
    let { type, syntax } = params;

    if (!type && syntax) {
        if (knownSyntaxes.markup.includes(syntax)) {
            type = 'markup';
        } else if (knownSyntaxes.stylesheet.includes(syntax)) {
            type = 'stylesheet';
        } else {
            type = get(config, 'syntax', syntax, 'type')
                || get(config, 'project', params.project, 'syntax', syntax, 'type')
                || 'markup';
        }
    }

    if (!type) {
        type = 'markup';
    }

    if (!syntax) {
        syntax = defaultSyntaxes[type];
    }

    return { ...params, type, syntax };
}

function mergeConfig<T>(config: RawConfig, key: string, type: SyntaxType, syntax?: string, project?: string): T {
    return getConfig<T>(config, key, type, syntax, project)
        .reduce((out, obj) => Object.assign(out, obj), {} as T);
}

/**
 * Returns all available config values for given key set
 */
function getConfig<T>(config: RawConfig, key: string, type: SyntaxType, syntax?: string, project?: string): T[] {
    return [
        get(config, 'globals', type, key) as T,
        get(config, 'project', project, 'globals', type, key) as T,
        get(config, 'syntax', syntax, key) as T,
        get(config, 'project', project, 'syntax', syntax, key) as T
    ].filter(Boolean);
}

/**
 * Safe dot-property getter for `obj`: returns value of `obj` by given `key`,
 * separated by `.`, but doesn’t throw error if any of the property key exists
 */
function get<R>(obj: any, ...key: Array<string | number | void>): R | void {
    let result = obj;

    for (let i = 0, k: string | number | void; i < key.length; i++) {
        k = key[i];
        if (result == null) {
            break;
        }

        result = k != null ? result[k] : null;
    }

    return result != null ? result : void 0;
}
