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

export interface AbbreviationTracker {
    abbreviation: string;
    position: {
        line: number;
        character: number;
    };
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
    expanded: string;
    isValid: boolean;
    lastUpdated: number;
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
    abbreviations: Map<string, AbbreviationTracker>;
    lastChangeTime: number;
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

export interface EmmetExpansionResult {
    success: boolean;
    expanded?: string;
    error?: string;
    abbreviation: string;
    syntax: EmmetSyntax;
}

export interface CursorTrackingOptions {
    enableRealTimeParsing: boolean;
    debounceDelay: number;
    maxAbbreviationLength: number;
    minAbbreviationLength: number;
}

export interface EmmetLanguageConfig {
    syntax: EmmetSyntax;
    triggerCharacters: string[];
    fileExtensions: string[];
    completionItemKind: 'snippet' | 'property' | 'text';
}

export const LANGUAGE_CONFIG_MAP: Record<SupportedLanguage, EmmetLanguageConfig> = {
    html: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.html', '.htm'],
        completionItemKind: 'snippet'
    },
    xml: {
        syntax: 'markup', 
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.xml'],
        completionItemKind: 'snippet'
    },
    xsl: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.xsl', '.xslt'],
        completionItemKind: 'snippet'
    },
    jsx: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.jsx'],
        completionItemKind: 'snippet'
    },
    tsx: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.tsx'],
        completionItemKind: 'snippet'
    },
    vue: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.vue'],
        completionItemKind: 'snippet'
    },
    svelte: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.svelte'],
        completionItemKind: 'snippet'
    },
    css: {
        syntax: 'stylesheet',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*'],
        fileExtensions: ['.css'],
        completionItemKind: 'property'
    },
    scss: {
        syntax: 'stylesheet',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&', '$'],
        fileExtensions: ['.scss'],
        completionItemKind: 'property'
    },
    sass: {
        syntax: 'stylesheet', 
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&', '$'],
        fileExtensions: ['.sass'],
        completionItemKind: 'property'
    },
    less: {
        syntax: 'stylesheet',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&', '.', '#'],
        fileExtensions: ['.less'],
        completionItemKind: 'property'
    },
    stylus: {
        syntax: 'stylesheet',
        triggerCharacters: [':', '-', '!', '@', '%', '^', '+', '*', '&'],
        fileExtensions: ['.styl', '.stylus'],
        completionItemKind: 'property'
    },
    javascript: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.js', '.mjs'],
        completionItemKind: 'snippet'
    },
    typescript: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.ts'],
        completionItemKind: 'snippet'
    },
    javascriptreact: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.jsx'],
        completionItemKind: 'snippet'
    },
    typescriptreact: {
        syntax: 'markup',
        triggerCharacters: ['.', '#', '*', '+', '>', '^', '[', '{', ':', '$', '-', '_'],
        fileExtensions: ['.tsx'],
        completionItemKind: 'snippet'
    }
};