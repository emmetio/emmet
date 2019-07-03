import { EMElement } from '@emmetio/abbreviation';
import Scanner from '@emmetio/scanner';
import { isAlpha, isAlphaNumericWord } from '@emmetio/scanner/utils';
import { Container } from './walk';
import { ResolvedConfig, SnippetsMap } from '../types';

const enum Chars {
    Start = 36, // $
    LeftBrace = 123, // {
    RightBrace = 125, // {
    Escape = 92, // \
    Dash = 45, // -
}

/**
 * Replaces all unescaped `${variable}` tokens in given parsed abbreviation
 * `node` with values provided in `variables` config. Precede `$` with `\` to
 * escape it and skip replacement
 */
export default function replace(node: EMElement, ancestor: Container[], config: ResolvedConfig) {
    // Replace variables in attributes.
    for (const attr of node.attributes) {
        if (attr.value) {
            attr.value.value = replaceVariables(attr.value.value, config.variables);
        }
    }

    if (node.value) {
        node.value.value = replaceVariables(node.value.value, config.variables);
    }
}

/**
 * Replaces variable references in given text with values from config
 */
export function replaceVariables(text: string, variables: SnippetsMap): string {
    const scanner = new Scanner(text);
    let offset = 0;
    let result = '';

    while (!scanner.eof()) {
        if (scanner.eat(Chars.Escape)) {
            scanner.pos++;
        } else if (consumeVariable(scanner)) {
            const name = scanner.current().slice(2, -1);
            result += text.slice(offset, scanner.start)
                + (name in variables ? variables[name] : name);
            offset = scanner.pos;
        } else {
            scanner.pos++;
        }
    }

    return result + text.slice(offset);
}

/**
 * Returns `true` if valid variable was consumed from given scanner
 */
function consumeVariable(scanner: Scanner): boolean {
    const start = scanner.pos;
    if (scanner.eat(Chars.Start) && scanner.eat(Chars.LeftBrace) && scanner.eat(isAlpha)) {
        scanner.eatWhile(isVariableName);
        if (scanner.eat(Chars.RightBrace)) {
            scanner.start = start;
            return true;
        }
    }

    scanner.pos = start;
    return true;
}

function isVariableName(ch: number) {
    return ch === Chars.Dash || isAlphaNumericWord(ch);
}
