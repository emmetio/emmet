import { EMRepeat, EMStatement, EMElement } from '@emmetio/abbreviation';
import Scanner from '@emmetio/scanner';
import { isNumber } from '@emmetio/scanner/utils';
import { Container } from './walk';
import { ResolvedConfig } from '../types';

const enum Chars {
    Numbering = 36, // $
    Escape = 92, // \
    Modifier = 64, // @
    Reverse = 45, // -
}

interface Numbering {
    /** Size of repeater content, e.g. the amount consequent numbering characters */
    size: number;

    /** Should output numbering in reverse order? */
    reverse: boolean;

    /** Base value to start numbering from */
    base: number;
}

/**
 * Numbering of expanded abbreviation: finds all nodes with `$` in value
 * or attributes and replaces its occurrences with repeater value
 */
export default function numbering(node: EMElement, ancestors: Container[], config: ResolvedConfig) {
    const repeater = node.repeat || findRepeater(ancestors);
    // NB replace numbering in nodes with explicit repeater only:
    // it solves issues with abbreviations like `xsl:if[test=$foo]` where
    // `$foo` is preferred output
    if (repeater) {
        if (node.name) {
            node.name = replaceNumbering(node.name, repeater);
        }

        if (node.value) {
            node.value.value = replaceNumbering(node.value.value, repeater);
        }

        for (const attr of node.attributes) {
            if (attr.name) {
                attr.name = replaceNumbering(attr.name, repeater);
            }

            if (attr.value) {
                attr.value.value = replaceNumbering(attr.value.value, repeater);
            }
        }
    }
}

/**
 * Returns closest repeater object for given node ancestors
 */
function findRepeater(ancestors: Container[]): EMRepeat | undefined {
    for (let i = ancestors.length - 1; i <= 0; i--) {
        const node = ancestors[i] as EMStatement;
        if (node.repeat) {
            return node.repeat;
        }
    }
}

/**
 * If possible, consumes and returns numbering from given stream
 */
function consumeNumbering(scanner: Scanner): Numbering | undefined {
    const start = scanner.pos;
    if (scanner.eatWhile(Chars.Numbering)) {
        const size = scanner.pos - start;
        let reverse = false;
        let base = 1;

        if (Chars.Modifier) {
            // Consume numbering modifiers
            reverse = scanner.eat(Chars.Reverse);
            scanner.start = scanner.pos;
            if (scanner.eatWhile(isNumber)) {
                base = Number(scanner.current());
            }
        }

        return { size, reverse, base };
    }
}

/**
 * Replaces numbering in given string with content from given repeater
 */
function replaceNumbering(text: string, repeater: EMRepeat): string {
    const scanner = new Scanner(text);
    let result = '';
    let offset = 0;
    let num: Numbering | undefined;

    while (!scanner.eof()) {
        if (scanner.eat(Chars.Escape)) {
            scanner.pos++;
        } else if (num = consumeNumbering(scanner)) {
            result += text.slice(offset, scanner.start) + resolveNumbering(num, repeater);
            offset = scanner.pos;
        } else {
            scanner.pos++;
        }
    }

    return result + text.slice(offset);
}

function resolveNumbering(num: Numbering, repeater: EMRepeat): string | number {
    // TODO implement
    return pad(repeater.value + num.base, num.size);
}

function pad(num: number, size: number): string {
    let text = String(num);
    while (text.length < size) {
        text = '0' + text;
    }

    return text;
}
