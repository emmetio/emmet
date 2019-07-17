import { AbbreviationAttribute, AbbreviationNode, TokenValue } from '@emmetio/abbreviation';

/**
 * Merges attributes in current node: de-duplicates attributes with the same name
 * and merges class names
 */
export default function mergeAttributes(node: AbbreviationNode) {
    if (!node.attributes) {
        return;
    }

    const attributes: AbbreviationAttribute[] = [];
    const lookup: { [name: string]: AbbreviationAttribute } = {};

    for (const attr of node.attributes) {
        if (attr.name) {
            const attrName = attr.name;
            if (attrName in lookup) {
                const prev = lookup[attrName];
                if (attrName === 'class') {
                    prev.value = mergeValue(prev.value, attr.value, ' ');
                } else {
                    Object.assign(prev, attr);
                }
            } else {
                // Create new attribute instance so we can safely modify it later
                attributes.push(lookup[attrName] = { ...attr });
            }
        } else {
            attributes.push(attr);
        }
    }

    node.attributes = attributes;
}

/**
 * Merges two token lists into single list. Adjacent strings are merged together
 */
function mergeValue(prev?: TokenValue[], next?: TokenValue[], glue?: string): TokenValue[] | undefined {
    if (prev && next) {
        if (prev.length && glue) {
            append(prev, glue);
        }

        for (const t of next) {
            append(prev, t);
        }

        return prev;
    }

    const result = prev || next;
    return result && result.slice();
}

function append(tokens: TokenValue[], value: TokenValue) {
    const lastIx = tokens.length;
    if (typeof tokens[lastIx] === 'string' && typeof value === 'string') {
        tokens[lastIx] += value;
    } else {
        tokens.push(value);
    }
}
