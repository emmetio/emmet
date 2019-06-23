export interface Snippet {
    key: string | RegExp;
    value: string | SnippetFunction;
}

export type RawSnippets = Map<SnippetKey, SnippetValue> | { [name: string]: SnippetValue };
export type SnippetKey = string | RegExp;
export type SnippetValue = string | SnippetFunction;
export type SnippetFunction = (...args: any[]) => string;
