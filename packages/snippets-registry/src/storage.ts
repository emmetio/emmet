import { Snippet, SnippetFunction, RawSnippets } from './types';

export default class SnippetsStorage {
    disabled: boolean = false;
    private string: Map<string, Snippet> = new Map();
    private regexp: Map<RegExp, Snippet> = new Map();

    constructor(data?: RawSnippets) {
        if (data) {
            this.load(data);
        }
    }

    /**
     * Disables current store. A disabled store always returns `undefined`
     * on `get()` method
     */
    disable() {
        this.disabled = true;
    }

    /**
     * Enables current store.
     */
    enable() {
        this.disabled = false;
    }

    /**
     * Registers a new snippet item
     */
    set(key: string | RegExp, value: string | SnippetFunction) {
        if (typeof key === 'string') {
            key.split('|').forEach(k => this.string.set(k, { key: k, value }));
        } else if (key instanceof RegExp) {
            this.regexp.set(key, { key, value });
        } else {
            throw new Error('Unknown snippet key: ' + key);
        }

        return this;
    }

    /**
     * Returns a snippet matching given key. It first tries to find snippet
     * exact match in a string key map, then tries to match one with regexp key
     */
    get(key: string): Snippet | undefined {
        if (this.disabled) {
            return undefined;
        }

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
        this.reset();
        if (data instanceof Map) {
            data.forEach((value, key) => this.set(key, value));
        } else if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => this.set(key, data[key]));
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
    values() {
        if (this.disabled) {
            return [];
        }

        const str = Array.from(this.string.values());
        const regexp = Array.from(this.regexp.values());
        return str.concat(regexp);
    }
}
