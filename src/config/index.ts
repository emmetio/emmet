import { SyntaxType, Config, GlobalConfig, BaseConfig } from './types';
import { defaultConfig, syntaxConfig } from './defaults';

export * from './types';
export * from './defaults';

export type UserConfig = Partial<BaseConfig> & {
    syntax?: string,
    type?: SyntaxType,
    text?: string | string[]
};

/**
 * Default syntaxes for abbreviation types
 */
export const defaultSyntaxes: { [name in SyntaxType]: string } = {
    markup: 'html',
    stylesheet: 'css'
};

/**
 * List of all known syntaxes
 */
export const syntaxes = {
    markup: ['html', 'xml', 'xsl', 'jsx', 'js', 'pug', 'slim', 'haml'],
    stylesheet: ['css', 'sass', 'scss', 'less', 'sss', 'stylus']
};

export default function resolveConfig(config: UserConfig = {}, globals: GlobalConfig = {}): Config {
    const type: SyntaxType = config.type || 'markup';
    const syntax: string = config.syntax || defaultSyntaxes[type];

    return {
        ...defaultConfig,
        type,
        syntax,
        variables: mergedData(type, syntax, 'variables', config, globals),
        snippets: mergedData(type, syntax, 'snippets', config, globals),
        options: mergedData(type, syntax, 'options', config, globals)
    };
}

function mergedData<K extends keyof BaseConfig>(type: SyntaxType, syntax: string, key: K, config: UserConfig, globals: GlobalConfig = {}): Config[K] {
    const typeDefaults = syntaxConfig[type];
    const typeOverride = globals[type];
    const syntaxDefaults = syntaxConfig[syntax];
    const syntaxOverride = globals[syntax];

    return {
        ...defaultConfig[key],
        ...(typeDefaults && typeDefaults[key]),
        ...(syntaxDefaults && syntaxDefaults[key]),
        ...(typeOverride && typeOverride[key]),
        ...(syntaxOverride && syntaxOverride[key]),
        ...config[key]
    };
}
