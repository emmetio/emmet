import { Container } from './walk';
import { ResolvedConfig } from '../types';

interface VariableItem {
    name: string;
    location: number;
    length: number;
}

/**
 * Replaces all unescaped `${variable}` tokens in given parsed abbreviation
 * `node` with values provided in `variables` config. Precede `$` with `\` to
 * escape it and skip replacement
 */
export default function replaceInNode(node: Container, ancestor: Container[], config: ResolvedConfig) {
    // Replace variables in attributes.
    if (node.type === 'EMElement') {
        for (const attr of node.attributes) {
            if (attr.value) {
                attr.value.value = replaceInString(attr.value.value, config);
            }
        }

        if (node.value) {
            node.value.value = replaceInString(node.value.value, config);
        }
    }
}

/**
 * Replaces all unescaped `${variable}` occurances in given string with values
 * from `variables` object
 */
function replaceInString(text: string, config: ResolvedConfig): string {
    const model = createModel(text);
    let offset = 0;
    let output = '';

    for (let i = 0, il = model.variables.length; i < il; i++) {
        const v = model.variables[i];
        const value = v.name in config.variables
            ? config.variables[v.name]
            : v.name;
        // if (typeof value === 'function') {
        //     value = value(model.string, v, offset + v.location);
        // }

        output += model.string.slice(offset, v.location) + value;
        offset = v.location + v.length;
    }

    return output + model.string.slice(offset);
}

/**
 * Creates variable model from given string. The model contains a `string` with
 * all escaped variable tokens written without escape symbol and `variables`
 * property with all unescaped variables and their ranges
 */
function createModel(text: string): { string: string, variables: VariableItem[] } {
    const reVariable = /\$\{([a-z][\w\-]*)\}/ig;
    const escapeCharCode = 92; // `\` symbol
    const variables: VariableItem[] = [];

    // We have to replace unescaped (e.g. not preceded with `\`) tokens.
    // Instead of writing a stream parser, we’ll cut some edges here:
    // 1. Find all tokens
    // 2. Walk string char-by-char and resolve only tokens that are not escaped
    const tokens: Map<number, RegExpExecArray> = new Map();
    let m: RegExpExecArray | null;
    while (m = reVariable.exec(text)) {
        tokens.set(m.index, m);
    }

    if (tokens.size) {
        let start = 0;
        let pos = 0;
        let output = '';
        const len = text.length;
        while (pos < len) {
            if (text.charCodeAt(pos) === escapeCharCode && tokens.has(pos + 1)) {
                // Found escape symbol that escapes variable: we should
                // omit this symbol in output string and skip variable
                const token = tokens.get(pos + 1)!;
                output += text.slice(start, pos) + token[0];
                start = pos = token.index + token[0].length;
                tokens.delete(pos + 1);
                continue;
            }

            pos++;
        }

        text = output + text.slice(start);

        // Not using `.map()` here to reduce memory allocations
        const validMatches = Array.from(tokens.values());
        for (let i = 0, il = validMatches.length; i < il; i++) {
            const token = validMatches[i];
            variables.push({
                name: token[1],
                location: token.index,
                length: token[0].length
            });
        }
    }

    return { string: text, variables };
}
