import { type UserConfig } from '../../..';
import { EmmetSettings } from './types';
import { getEmmetSyntax } from './language';

/**
 * Emmet config for expanding abbreviations in given language, with user
 * preferences applied on top of the server defaults
 */
export function getEmmetConfig(languageId: string, settings: EmmetSettings): UserConfig {
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
