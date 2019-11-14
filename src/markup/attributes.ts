import { AbbreviationAttribute, AbbreviationNode, Value } from '@emmetio/abbreviation';
import { Config } from '../config';

/**
 * Merges attributes in current node: de-duplicates attributes with the same name
 * and merges class names
 */
export default function mergeAttributes(node: AbbreviationNode, config: Config) {
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
                    mergeDeclarations(prev, attr, config);
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
function mergeValue(prev?: Value[], next?: Value[], glue?: string): Value[] | undefined {
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

/**
 * Merges data from `src` attribute into `dest` and returns it
 */
function mergeDeclarations(dest: AbbreviationAttribute, src: AbbreviationAttribute, config: Config): AbbreviationAttribute {
    dest.name = src.name;

    if (!config.options['output.reverseAttributes']) {
        dest.value = src.value;
    }

    // Keep high-priority properties
    if (!dest.implied) {
        dest.implied = src.implied;
    }

    if (!dest.boolean) {
        dest.boolean = src.boolean;
    }

    if (dest.valueType !== 'expression') {
        dest.valueType = src.valueType;
    }

    return dest;
}

function append(tokens: Value[], value: Value) {
    const lastIx = tokens.length - 1;
    if (typeof tokens[lastIx] === 'string' && typeof value === 'string') {
        tokens[lastIx] += value;
    } else {
        tokens.push(value);
    }
}
