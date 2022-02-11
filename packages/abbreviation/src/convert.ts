import { TokenGroup, TokenStatement, TokenElement, TokenAttribute, isQuote, isBracket } from './parser';
import { Abbreviation, ParserOptions, AbbreviationNode, ConvertState, Value, AbbreviationAttribute, AttributeType } from './types';
import { Repeater, ValueToken, Quote, Field } from './tokenizer';
import stringify from './stringify';

const urlRegex = /^((https?:|ftp:|file:)?\/\/|(www|ftp)\.)[^ ]*$/;
const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,5}$/;

/**
 * Converts given token-based abbreviation into simplified and unrolled node-based
 * abbreviation
 */
export default function convert(abbr: TokenGroup, options: ParserOptions = {}): Abbreviation {
    let textInserted = false;

    let cleanText: string | string[] | undefined;
    if (options.text) {
        if (Array.isArray(options.text)) {
            cleanText = options.text.filter(s => s.trim());
        } else {
            cleanText = options.text;
        }
    }

    const result: Abbreviation = {
        type: 'Abbreviation',
        children: convertGroup(abbr, {
            inserted: false,
            repeaters: [],
            text: options.text,
            cleanText,
            repeatGuard: options.maxRepeat || Number.POSITIVE_INFINITY,
            getText(pos) {
                textInserted = true;

                let value: string;
                if (Array.isArray(options.text)) {
                    if (pos !== undefined && pos >= 0 && pos < cleanText!.length) {
                        return cleanText![pos];
                    }
                    value = pos !== undefined ? options.text[pos] : options.text.join('\n');
                } else {
                    value = options.text ?? '';
                }
                return value;
            },
            getVariable(name) {
                const varValue = options.variables && options.variables[name];
                return varValue != null ? varValue : name;
            }
        })
    };

    if (options.text != null && !textInserted) {
        // Text given but no implicitly repeated elements: insert it into
        // deepest child
        const deepest = deepestNode(last(result.children));
        if (deepest) {
            const text = Array.isArray(options.text) ? options.text.join('\n') : options.text;
            insertText(deepest, text);

            if (deepest.name === 'a' && options.href) {
                // Automatically update value of `<a>` element if inserting URL or email
                insertHref(deepest, text);
            }
        }
    }

    return result;
}

/**
 * Converts given statement to abbreviation nodes
 */
function convertStatement(node: TokenStatement, state: ConvertState): AbbreviationNode[] {
    let result: AbbreviationNode[] = [];

    if (node.repeat) {
        // Node is repeated: we should create copies of given node
        // and supply context token with actual repeater state
        const original = node.repeat;
        const repeat = { ...original } as Repeater;
        repeat.count = repeat.implicit && Array.isArray(state.text)
            ? state.cleanText!.length
            : (repeat.count || 1);
        let items: AbbreviationNode[];

        state.repeaters.push(repeat);

        for (let i = 0; i < repeat.count; i++) {
            repeat.value = i;
            node.repeat = repeat;
            items = isGroup(node)
                ? convertGroup(node, state)
                : convertElement(node, state);

            if (repeat.implicit && !state.inserted) {
                // It’s an implicit repeater but no repeater placeholders found inside,
                // we should insert text into deepest node
                const target = last(items);
                const deepest = target && deepestNode(target);
                if (deepest) {
                    insertText(deepest, state.getText(repeat.value));
                }
            }

            result = result.concat(items);

            // We should output at least one repeated item even if it’s reached
            // repeat limit
            if (--state.repeatGuard <= 0) {
                break;
            }
        }

        state.repeaters.pop();
        node.repeat = original;

        if (repeat.implicit) {
            state.inserted = true;
        }
    } else {
        result = result.concat(isGroup(node) ? convertGroup(node, state) : convertElement(node, state));
    }

    return result;
}

function convertElement(node: TokenElement, state: ConvertState): AbbreviationNode[] {
    let children: AbbreviationNode[] = [];

    const elem = {
        type: 'AbbreviationNode',
        name: node.name && stringifyName(node.name, state),
        value: node.value && stringifyValue(node.value, state),
        attributes: void 0,
        children,
        repeat: node.repeat && { ...node.repeat },
        selfClosing: node.selfClose,
    } as AbbreviationNode;
    let result: AbbreviationNode[] = [elem];

    for (const child of node.elements) {
        children = children.concat(convertStatement(child, state));
    }

    if (node.attributes) {
        elem.attributes = [];
        for (const attr of node.attributes) {
            elem.attributes.push(convertAttribute(attr, state));
        }
    }

    // In case if current node is a text-only snippet without fields, we should
    // put all children as siblings
    if (!elem.name && !elem.attributes && elem.value && !elem.value.some(isField)) {
        // XXX it’s unclear that `children` is not bound to `elem`
        // due to concat operation
        result = result.concat(children);
    } else {
        elem.children = children;
    }

    return result;
}

function convertGroup(node: TokenGroup, state: ConvertState): AbbreviationNode[] {
    let result: AbbreviationNode[] = [];
    for (const child of node.elements) {
        result = result.concat(convertStatement(child, state));
    }

    if (node.repeat) {
        result = attachRepeater(result, node.repeat);
    }

    return result;
}

function convertAttribute(node: TokenAttribute, state: ConvertState): AbbreviationAttribute {
    let implied = false;
    let isBoolean = false;
    let valueType: AttributeType = node.expression ? 'expression' : 'raw';
    let value: Value[] | undefined;
    const name = node.name && stringifyName(node.name, state);

    if (name && name[0] === '!') {
        implied = true;
    }

    if (name && name[name.length - 1] === '.') {
        isBoolean = true;
    }

    if (node.value) {
        const tokens = node.value.slice();

        if (isQuote(tokens[0])) {
            // It’s a quoted value: remove quotes from output but mark attribute
            // value as quoted
            const quote = tokens.shift() as Quote;
            if (tokens.length && last(tokens).type === quote.type) {
                tokens.pop();
            }
            valueType = quote.single ? 'singleQuote' : 'doubleQuote';
        } else if (isBracket(tokens[0], 'expression', true)) {
            // Value is expression: remove brackets but mark value type
            valueType = 'expression';
            tokens.shift();
            if (isBracket(last(tokens), 'expression', false)) {
                tokens.pop();
            }
        }

        value = stringifyValue(tokens, state);
    }

    return {
        name: isBoolean || implied
            ? name!.slice(implied ? 1 : 0, isBoolean ? -1 : void 0)
            : name,
        value,
        boolean: isBoolean,
        implied,
        valueType
    };
}

/**
 * Converts given token list to string
 */
function stringifyName(tokens: ValueToken[], state: ConvertState): string {
    let str = '';
    for (let i = 0; i < tokens.length; i++) {
        str += stringify(tokens[i], state);
    }

    return str;
}

/**
 * Converts given token list to value list
 */
function stringifyValue(tokens: ValueToken[], state: ConvertState): Value[] {
    const result: Value[] = [];
    let str = '';
    for (let i = 0, token: ValueToken; i < tokens.length; i++) {
        token = tokens[i];
        if (isField(token)) {
            // We should keep original fields in output since some editors has their
            // own syntax for field or doesn’t support fields at all so we should
            // capture actual field location in output stream
            if (str) {
                result.push(str);
                str = '';
            }
            result.push(token);
        } else {
            str += stringify(token, state);
        }
    }

    if (str) {
        result.push(str);
    }

    return result;
}

export function isGroup(node: any): node is TokenGroup {
    return node.type === 'TokenGroup';
}

function isField(token: any): token is Field {
    return typeof token === 'object' && token.type === 'Field' && token.index != null;
}

function last<T>(arr: T[]): T {
    return arr[arr.length - 1];
}

function deepestNode(node: AbbreviationNode): AbbreviationNode {
    return node.children.length ? deepestNode(last(node.children)) : node;
}

function insertText(node: AbbreviationNode, text: string) {
    if (node.value) {
        const lastToken = last(node.value);
        if (typeof lastToken === 'string') {
            node.value[node.value.length - 1] += text;
        } else {
            node.value.push(text);
        }
    } else {
        node.value = [text];
    }
}

function insertHref(node: AbbreviationNode, text: string) {
    let href = '';
    if (urlRegex.test(text)) {
        href = text;
        if (!/\w+:/.test(href) && !href.startsWith('//')) {
            href = `http://${href}`;
        }
    } else if (emailRegex.test(text)) {
        href = `mailto:${text}`;
    }

    const hrefAttribute = node.attributes?.find(attr => attr.name === 'href');
    if (!hrefAttribute) {
        if (!node.attributes) {
            node.attributes = [];
        }
        node.attributes.push({ name: 'href', value: [href], valueType: 'doubleQuote' });
    } else if (!hrefAttribute.value) {
        hrefAttribute.value = [href];
    }
}

function attachRepeater(items: AbbreviationNode[], repeater: Repeater): AbbreviationNode[] {
    for (const item of items) {
        if (!item.repeat) {
            item.repeat = { ...repeater };
        }
    }

    return items;
}
