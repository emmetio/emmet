export interface Snippet {
    key: string | RegExp;
    value: string | SnippetFunction;
}

export type RawSnippets = { [name: string]: SnippetValue } | Array<[SnippetKey, SnippetValue]>;
export type SnippetKey = string | RegExp;
export type SnippetValue = string | SnippetFunction;
export type SnippetFunction = (...args: any[]) => string;

export default class SnippetsRegistry {
    private string: Map<string, Snippet> = new Map();
    private regexp: Map<RegExp, Snippet> = new Map();

    constructor(data?: RawSnippets) {
        if (data) {
            this.load(data);
        }
    }

    /**
     * Registers a new snippet
     */
    set(key: string | RegExp, value: string | SnippetFunction) {
        if (key instanceof RegExp) {
            this.regexp.set(key, { key, value });
        } else {
            for (const k of key.split('|')) {
                this.string.set(k, { key: k, value });
            }
        }

        return this;
    }

    /**
     * Returns a snippet matching given key. It first tries to find snippet
     * exact match in a string key map, then tries to match one with regexp key
     */
    get(key: string): Snippet | undefined {
        if (this.string.has(key)) {
            return this.string.get(key);
        }

        for (const [regexp, snippet] of this.regexp) {
            if (regexp.test(key)) {
                return snippet;
            }
        }
    }

    /**
     * Batch load of snippets data
     */
    load(data: RawSnippets) {
        if (Array.isArray(data)) {
            for (const [key, value] of data) {
                this.set(key, value);
            }
        } else {
            for (const key of Object.keys(data)) {
                this.set(key, data[key]);
            }
        }
    }

    /**
     * Clears all stored snippets
     */
    reset() {
        this.string.clear();
        this.regexp.clear();
    }

    /**
     * Returns all available snippets from given store
     */
    values(): Snippet[] {
        const str = Array.from(this.string.values());
        const regexp = Array.from(this.regexp.values());
        return str.concat(regexp);
    }
}
