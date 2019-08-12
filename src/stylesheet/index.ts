import abbreviation, { CSSAbbreviation, CSSProperty, CSSValue, Literal, Value, Field } from '@emmetio/css-abbreviation';
import { Config, SnippetsMap } from '../config';
import createSnippet, { CSSSnippet, nest, getKeywords, CSSSnippetType, CSSSnippetRaw, CSSSnippetProperty, CSSKeywordRef } from './snippets';
import calculateScore from './score';

type MatchInput = CSSSnippet | CSSKeywordRef;

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export default function parse(abbr: string | CSSAbbreviation, config: Config, snippets = convertSnippets(config.snippets)): CSSAbbreviation {
    if (typeof abbr === 'string') {
        abbr = abbreviation(abbr);
    }

    // Run abbreviation resolve in two passes:
    // 1. Map each node to snippets, which are abbreviations as well. A single snippet
    // may produce multiple nodes
    // 2. Transform every resolved node
    // walk(abbr, snippets, config);
    // walk(abbr, transform, config);
    return abbr;
}

/**
 * Converts given raw snippets into internal snippets representation
 */
export function convertSnippets(snippets: SnippetsMap): CSSSnippet[] {
    const result: CSSSnippet[] = [];
    for (const key of Object.keys(snippets)) {
        result.push(createSnippet(key, snippets[key]));
    }

    return nest(result);
}

/**
 * Resolves given node: finds matched CSS snippets using fuzzy match and resolves
 * keyword aliases from node value
 */
function resolveNode(node: CSSProperty, snippets: CSSSnippet[], config: Config): CSSProperty {
    // TODO implement
    // if (config.context) {
    //     // Resolve as value of given CSS property
    //     return resolveAsPropertyValue(node, snippets.find(s => s.property === config.context), config);
    // }

    const snippet = findBestMatch(node.name!, snippets, config.options['stylesheet.fuzzySearchMinScore']);

    if (!snippet) {
        // Edge case: `!important` snippet
        return node.important ? setNodeAsText(node, '!important') : node;
    }

    return snippet.type === CSSSnippetType.Property
        ? resolveAsProperty(node, snippet, config)
        : resolveAsSnippet(node, snippet);
}

/**
 * Resolves given parsed abbreviation node as CSS property
 */
function resolveAsProperty(node: CSSProperty, snippet: CSSSnippetProperty, config: Config): CSSProperty {
    const abbr = node.name!;
    node.name = snippet.property;

    // Resolve keyword shortcuts
    const keywords = getKeywords(snippet);

    if (!node.value.length) {
        // No value defined, try to resolve unmatched part as a keyword alias
        const kw = findBestMatch(getUnmatchedPart(abbr, snippet.key), keywords);
        if (kw) {
            node.value = snippet.value[kw.index]!;
        } else if (snippet.value.length) {
            const defaultValue = snippet.value[0]!;
            node.value = defaultValue.some(hasField)
                ? defaultValue
                : defaultValue.map(n => wrapWithField(n));
        }
    } else {
        // replace keyword aliases in current node value
        for (let i = 0, token; i < node.value.value.length; i++) {
            token = node.value.value[i];

            if (token === '!') {
                token = `${!i ? '${1} ' : ''}!important`;
            } else if (isKeyword(token)) {
                token = findBestMatch(token.value, keywords)
                    || findBestMatch(token.value, globalKeywords)
                    || token;
            } else if (isNumericValue(token)) {
                token = resolveNumericValue(node.name, token, formatOptions);
            }

            node.value.value[i] = token;
        }
    }

    return node;
}

/**
 * Resolves given parsed abbreviation node as a snippet: a plain code chunk
 */
function resolveAsSnippet(node: CSSProperty, snippet: CSSSnippetRaw): CSSProperty {
    return setNodeAsText(node, snippet.value);
}

/**
 * Resolves given parsed abbreviation node as property value of given `snippet`:
 * tries to find best matching keyword from CSS snippet
 */
function resolveAsPropertyValue(node: CSSProperty, snippet: CSSSnippet, config: Config): CSSProperty {
    // Possible resolved result for CSS property:
    // * matched snippet keyword
    // * color (starts with #)
    // Everything else should result the same as input abbreviation
    let keywords = config.options['stylesheet.keywords'].slice();
    if (snippet) {
        keywords = keywords.concat(getKeywords(snippet));
    }

    const values = [node.name].concat(node.value.value)
        .filter(Boolean)
        .map(value => {
            if (typeof value === 'string' || value.type === 'keyword') {
                value = String(value);
                return findBestMatch(value, keywords, null, config.fuzzySearchMinScore) || value;
            }

            return value;
        });

    node.name = null;
    node.value.value = values;

    return node;
}

/**
 * Sets given parsed abbreviation node as a text snippet
 */
function setNodeAsText(node: CSSProperty, text: string): CSSProperty {
    node.name = void 0;
    node.value = [literalValue(text)];
    return node;
}

/**
 * Finds best matching item from `items` array
 * @param abbr  Abbreviation to match
 * @param items List of items for match
 * @param minScore The minimum score the best matched item should have to be a valid match.
 */
export function findBestMatch<T extends MatchInput>(abbr: string, items: T[], minScore = 0): T | null {
    let matchedItem: T | null = null;
    let maxScore = 0;

    for (const item of items) {
        const score = calculateScore(abbr, getScoringPart(item));

        if (score === 1) {
            // direct hit, no need to look further
            return item;
        }

        if (score && score >= maxScore) {
            maxScore = score;
            matchedItem = item;
        }
    }

    return maxScore >= minScore ? matchedItem : null;
}

function getScoringPart(item: MatchInput): string {
    return (item as CSSKeywordRef).keyword || (item as CSSSnippet).key;
}

/**
 * Returns a part of `abbr` that wasn’t directly matched against `str`.
 * For example, if abbreviation `poas` is matched against `position`,
 * the unmatched part will be `as` since `a` wasn’t found in string stream
 */
function getUnmatchedPart(abbr: string, str: string): string {
    for (let i = 0, lastPos = 0; i < abbr.length; i++) {
        lastPos = str.indexOf(abbr[i], lastPos);
        if (lastPos === -1) {
            return abbr.slice(i);
        }
        lastPos++;
    }

    return '';
}

/**
 * Check if given CSS value token is a keyword
 * @param {*} token
 * @return {Boolean}
 */
function isKeyword(token) {
    return tokenTypeOf(token, 'keyword');
}

/**
 * Check if given CSS value token is a numeric value
 * @param  {*}  token
 * @return {Boolean}
 */
function isNumericValue(token) {
    return tokenTypeOf(token, 'numeric');
}

function tokenTypeOf(token, type) {
    return token && typeof token === 'object' && token.type === type;
}

/**
 * Resolves numeric value for given CSS property
 * @param  {String} property    CSS property name
 * @param  {NumericValue} token CSS numeric value token
 * @param  {Object} formatOptions Formatting options for units
 * @return {NumericValue}
 */
function resolveNumericValue(property, token, formatOptions) {
    if (token.unit) {
        token.unit = formatOptions.unitAliases[token.unit] || token.unit;
    } else if (token.value !== 0 && unitlessProperties.indexOf(property) === -1) {
        // use `px` for integers, `em` for floats
        // NB: num|0 is a quick alternative to Math.round(0)
        token.unit = token.value === (token.value | 0) ? formatOptions.intUnit : formatOptions.floatUnit;
    }

    return token;
}

/**
 * Constructs CSS property value with given literal
 */
function literalValue(value: string): CSSValue {
    return {
        type: 'CSSValue',
        value: [literal(value)]
    };
}

/**
 * Constructs literal token
 */
function literal(value: string): Literal {
    return { type: 'Literal', value };
}

/**
 * Constructs field token
 */
function field(index: number, name: string): Field {
    return { type: 'Field', index, name };
}

/**
 * Check if given value contains fields
 */
function hasField(value: CSSValue): boolean {
    for (const v of value.value) {
        if (v.type === 'Field' || (v.type === 'FunctionCall' && v.arguments.some(hasField))) {
            return true;
        }
    }

    return false;
}

interface WrapState {
    index: number;
}

/**
 * Wraps tokens of given abbreviation with fields
 */
function wrapWithField(node: CSSValue, state: WrapState = { index: 1 }): CSSValue {
    let value: Value[] = [];
    for (const v of node.value) {
        switch (v.type) {
            case 'ColorValue':
                value.push(field(state.index++, v.raw));
                break;
            case 'Literal':
                value.push(field(state.index++, v.value));
                break;
            case 'NumberValue':
                value.push(field(state.index++, `${v.value}${v.unit}`));
                break;
            case 'StringValue':
                const q = v.quote === 'single' ? '\'' : '"';
                value.push(field(state.index++, q + v.value + q));
                break;
            case 'FunctionCall':
                value.push(field(state.index++, v.name), literal('('));
                for (let i = 0, il = v.arguments.length; i < il; i++) {
                    value = value.concat(wrapWithField(v.arguments[i], state).value);
                    if (i !== il - 1) {
                        value.push(literal(', '));
                    }
                }
                value.push(literal(')'));
                break;
            default:
                value.push(v);
        }
    }

    return {...node, value };
}
