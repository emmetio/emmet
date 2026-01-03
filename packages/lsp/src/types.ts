export interface EmmetSettings {
    enabled: boolean;
    showExpandedPreview: boolean;
    showSuggestionsAsSnippets: boolean;
    includeLanguages: { [key: string]: string };
    variables: { [key: string]: string };
    syntaxProfiles: { [key: string]: any };
    preferences: { [key: string]: any };
    excludeLanguages: string[];
    extensionsPath: string[];
    triggerExpansionOnTab: boolean;
    useNewEmmet: boolean;
    showAbbreviationSuggestions: boolean;
    optimizeStylesheetParsing: boolean;
}

/**
 * Abbreviation found at the cursor. Holds the extraction result only: expanding
 * it is up to the consumer, since expansion depends on user settings
 */
export interface AbbreviationTracker {
    abbreviation: string;
    range: {
        start: {
            line: number;
            character: number;
        };
        end: {
            line: number;
            character: number;
        };
    };
    documentUri: string;
}

export interface EmmetCompletionData {
    abbreviation: string;
    expanded: string;
    range: {
        start: {
            line: number;
            character: number;
        };
        end: {
            line: number;
            character: number;
        };
    };
    syntax: 'markup' | 'stylesheet';
    language: string;
}

export interface DocumentTrackingState {
    /** Abbreviation at the last known cursor position, if any */
    tracker: AbbreviationTracker | null;
    /** Last cursor position reported by the client */
    cursorPosition?: {
        line: number;
        character: number;
    };
}

export type SupportedLanguage = 
    | 'html'
    | 'xml' 
    | 'xsl'
    | 'jsx'
    | 'tsx'
    | 'vue'
    | 'svelte'
    | 'css'
    | 'scss'
    | 'sass'
    | 'less'
    | 'stylus'
    | 'javascript'
    | 'typescript'
    | 'javascriptreact'
    | 'typescriptreact';

export type EmmetSyntax = 'markup' | 'stylesheet';

/** Comment and string syntax a language follows */
export type SyntaxFamily = 'html' | 'css' | 'js';

export interface EmmetLanguageConfig {
    syntax: EmmetSyntax;
    family: SyntaxFamily;
    triggerCharacters: string[];
    fileExtensions: string[];
    completionItemKind: 'snippet' | 'property' | 'text';
}

export const LANGUAGE_CONFIG_MAP: Record<SupportedLanguage, EmmetLanguageConfig> = {
    html: {
        syntax: 'markup',
        family: 'html',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.html', '.htm'],
        completionItemKind: 'snippet'
    },
    xml: {
        syntax: 'markup', 
        family: 'html',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.xml'],
        completionItemKind: 'snippet'
    },
    xsl: {
        syntax: 'markup',
        family: 'html',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.xsl', '.xslt'],
        completionItemKind: 'snippet'
    },
    jsx: {
        syntax: 'markup',
        family: 'js',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.jsx'],
        completionItemKind: 'snippet'
    },
    tsx: {
        syntax: 'markup',
        family: 'js',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.tsx'],
        completionItemKind: 'snippet'
    },
    vue: {
        syntax: 'markup',
        family: 'html',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.vue'],
        completionItemKind: 'snippet'
    },
    svelte: {
        syntax: 'markup',
        family: 'html',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.svelte'],
        completionItemKind: 'snippet'
    },
    css: {
        syntax: 'stylesheet',
        family: 'css',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*'],
        fileExtensions: ['.css'],
        completionItemKind: 'property'
    },
    scss: {
        syntax: 'stylesheet',
        family: 'css',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&', '$'],
        fileExtensions: ['.scss'],
        completionItemKind: 'property'
    },
    sass: {
        syntax: 'stylesheet', 
        family: 'css',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&', '$'],
        fileExtensions: ['.sass'],
        completionItemKind: 'property'
    },
    less: {
        syntax: 'stylesheet',
        family: 'css',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&', '.', '#'],
        fileExtensions: ['.less'],
        completionItemKind: 'property'
    },
    stylus: {
        syntax: 'stylesheet',
        family: 'css',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&'],
        fileExtensions: ['.styl', '.stylus'],
        completionItemKind: 'property'
    },
    javascript: {
        syntax: 'markup',
        family: 'js',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.js', '.mjs'],
        completionItemKind: 'snippet'
    },
    typescript: {
        syntax: 'markup',
        family: 'js',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.ts'],
        completionItemKind: 'snippet'
    },
    javascriptreact: {
        syntax: 'markup',
        family: 'js',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.jsx'],
        completionItemKind: 'snippet'
    },
    typescriptreact: {
        syntax: 'markup',
        family: 'js',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.tsx'],
        completionItemKind: 'snippet'
    }
};