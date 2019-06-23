import SnippetsStorage from './storage';
import { RawSnippets, SnippetKey, Snippet } from './types';

export interface AllOptions {
    /**
     * Return snippets only of given type: `string` or `regexp`. Returns all
     * snippets if not defined
     */
    type ?: 'string' | 'regexp';
}

interface StorageItem {
    /** Current item priority level */
    level: number;
    store: SnippetsStorage;
}

/**
 * A snippets registry. Contains snippets, separated by store and sorted by
 * priority: a store with higher priority takes precedence when resolving snippet
 * for given key
 */
export default class SnippetsRegistry {
    private registry: StorageItem[] = [];
    /**
     * Creates snippets registry, filled with given `data`
     * @param data Registry snippets. If array is given, adds items
     * from array in order of precedence, registers global snippets otherwise
     */
    constructor(data?: RawSnippets | RawSnippets[]) {
        if (Array.isArray(data)) {
            data.forEach((snippets, level) => this.add(snippets, level));
        } else if (data && typeof data === 'object') {
            this.add(data);
        }
    }

    /**
     * Return store for given level
     */
    get(level: number): SnippetsStorage | void {
        for (const item of this.registry) {
            if (item.level === level) {
                return item.store;
            }
        }
    }

    /**
     * Adds new store for given level
     * @param snippets A snippets data for new store
     * @param level Store level (priority). Store with higher level
     * takes precedence when resolving snippets
     */
    add(snippets: RawSnippets, level = 0): SnippetsStorage {
        const store = new SnippetsStorage(snippets);

        // Remove previous store from same level
        this.remove(level);

        this.registry.push({ level, store });
        this.registry.sort((a, b) => b.level - a.level);

        return store;
    }

    /**
     * Remove registry with given level or store
     * @param {Number|SnippetsStorage} data Either level or snippets store
     */
    remove(data: number | SnippetsStorage) {
        this.registry = this.registry
            .filter(item => item.level !== data && item.store !== data);
    }

    /**
     * Returns snippet from registry that matches given name
     */
    resolve(name: string): Snippet | null {
        for (const { store } of this.registry) {
            const snippet = store.get(name);
            if (snippet) {
                return snippet;
            }
        }

        return null;
    }

    /**
     * Returns all available snippets from current registry. Snippets with the
     * same key are resolved by their storage priority.
     */
    all(options: AllOptions = {}): Snippet[] {
        const result: Map<SnippetKey, Snippet> = new Map();

        const fillResult = (snippet: Snippet) => {
            const type = snippet.key instanceof RegExp ? 'regexp' : 'string';
            if ((!options.type || options.type === type) && !result.has(snippet.key)) {
                result.set(snippet.key, snippet);
            }
        };

        this.registry.forEach(item => {
            item.store.values().forEach(fillResult);
        });

        return Array.from(result.values());
    }

    /**
     * Removes all stores from registry
     */
    clear() {
        this.registry.length = 0;
    }
}
