import parse, { CSSValue, ParseOptions, FunctionCall, Literal } from '@emmetio/css-abbreviation';

export type CSSSnippet = CSSSnippetRaw | CSSSnippetProperty;

interface KeywordMap {
    [name: string]: FunctionCall | Literal;
}

export const enum CSSSnippetType {
    Raw = 'Raw',
    Property = 'Property'
}

interface CSSSnippetBase {
    type: CSSSnippetType;
    key: string;
}

export interface CSSSnippetRaw extends CSSSnippetBase {
    type: CSSSnippetType.Raw;
    value: string;
}

export interface CSSSnippetProperty extends CSSSnippetBase {
    type: CSSSnippetType.Property;
    property: string;
    value: CSSValue[][];
    keywords: KeywordMap;
    dependencies: CSSSnippetProperty[];
}

const reProperty = /^([a-z-]+)(?:\s*:\s*([^\n\r;]+?);*)?$/;
const opt: ParseOptions = { value: true };

/**
 * Creates structure for holding resolved CSS snippet
 */
export default function createSnippet(key: string, value: string): CSSSnippet {
    // A snippet could be a raw text snippet (e.g. arbitrary text string) or a
    // CSS property with possible values separated by `|`.
    // In latter case, we have to parse snippet as CSS abbreviation
    const m = value.match(reProperty);
    if (m) {
        const keywords: KeywordMap = {};
        const parsed: CSSValue[][] = m[2] ? m[2].split('|').map(parseValue) : [];

        for (const item of parsed) {
            for (const cssVal of item) {
                collectKeywords(cssVal, keywords);
            }
        }

        return {
            type: CSSSnippetType.Property,
            key,
            property: m[1],
            value: parsed,
            keywords,
            dependencies: []
        };
    }

    return { type: CSSSnippetType.Raw, key, value };
}

/**
 * Nests more specific CSS properties into shorthand ones, e.g.
 * `background-position-x` -> `background-position` -> `background`
 */
export function nest(snippets: CSSSnippet[]): CSSSnippet[] {
    snippets = snippets.slice().sort(snippetsSort);
    const stack: CSSSnippetProperty[] = [];
    let prev: CSSSnippet;

    // For sorted list of CSS properties, create dependency graph where each
    // shorthand property contains its more specific one, e.g.
    // background -> background-position -> background-position-x
    for (const cur of snippets.filter(isProperty)) {
        // Check if current property belongs to one from parent stack.
        // Since `snippets` array is sorted, items are perfectly aligned
        // from shorthands to more specific variants
        while (stack.length) {
            prev = stack[stack.length - 1];

            if (cur.property.startsWith(prev.property!)
                && cur.property.charCodeAt(prev.property!.length) === 45 /* - */) {
                prev.dependencies.push(cur);
                stack.push(cur);
                break;
            }

            stack.pop();
        }

        if (!stack.length) {
            stack.push(cur);
        }

    }

    return snippets;
}

/**
 * A sorting function for array of snippets
 */
function snippetsSort(a: CSSSnippet, b: CSSSnippet): number {
    if (a.key === b.key) {
        return 0;
    }

    return a.key < b.key ? -1 : 1;
}

function parseValue(value: string): CSSValue[] {
    return parse(value.trim(), opt)[0].value;
}

function isProperty(snippet: CSSSnippet): snippet is CSSSnippetProperty {
    return snippet.type === CSSSnippetType.Property;
}

function collectKeywords(cssVal: CSSValue, dest: KeywordMap) {
    for (const v of cssVal.value) {
        if (v.type === 'Literal') {
            dest[v.value] = v;
        } else if (v.type === 'FunctionCall') {
            dest[v.name] = v;
        } else if (v.type === 'Field') {
            // Create literal from field, if available
            const value = v.name.trim();
            if (value) {
                dest[value] = { type: 'Literal', value };
            }
        }
    }
}
