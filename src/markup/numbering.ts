import { EMRepeat, EMStatement, EMElement, EMLiteral } from '@emmetio/abbreviation';
import Scanner from '@emmetio/scanner';
import { isNumber } from '@emmetio/scanner/utils';
import { Container } from './walk';
import { ResolvedConfig } from '../types';
import { replaceToken } from './utils';

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
        replaceInItem(node, repeater);
        for (const attr of node.attributes) {
            replaceInItem(attr, repeater);
        }
    }
}

function replaceInItem(item: { name?: string, value?: EMLiteral }, repeater: EMRepeat) {
    if (item.name) {
        item.name = replaceNumbering(item.name, repeater);
    }

    if (item.value) {
        item.value.value = replaceNumbering(item.value.value, repeater);
    }
}

/**
 * Returns closest repeater object for given node ancestors
 */
function findRepeater(ancestors: Container[]): EMRepeat | undefined {
    for (let i = ancestors.length - 1; i >= 0; i--) {
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

        scanner.start = start;

        return { size, reverse, base };
    }
}

/**
 * Replaces numbering in given string with content from given repeater
 */
function replaceNumbering(text: string, repeater: EMRepeat): string {
    return replaceToken(text, consumeNumbering, num => resolveNumbering(num!, repeater));
}

function resolveNumbering(num: Numbering, repeater: EMRepeat): string {
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
