import { Abbreviation, AbbreviationNode, AbbreviationAttribute, Field } from '@emmetio/abbreviation';
import { ResolvedConfig } from '../../types';
import walk, { WalkState, WalkNext } from './walk';
import createOutputStream, { pushNewline, pushString } from '../../output-stream';
import { pushTokens } from './utils';

interface AttributesCollection {
    /** Primary element attributes: `id` and `class` */
    primary: AbbreviationAttribute[];

    /** Secondary element attributes: everything except `id` and `class` */
    secondary: AbbreviationAttribute[];
}

const caret = [{ type: 'Field', index: 0, name: '' } as Field];

export default function haml(abbr: Abbreviation, config: ResolvedConfig): string {
    const state: WalkState = {
        // @ts-ignore: Will set value in iterator
        current: null,
        parent: void 0,
        ancestors: [],
        profile: config.profile,
        field: 1,
        out: createOutputStream(config.options)
    };

    walk(abbr, element, state);
    return state.out.value;
}

/**
 * Outputs `node` content to output stream of `state`
 * @param node Context node
 * @param index Index of `node` in `items`
 * @param items List of `node`’s siblings
 * @param state Current walk state
 */
function element(node: AbbreviationNode, index: number, items: AbbreviationNode[], state: WalkState, next: WalkNext) {
    const { out } = state;
    const { primary, secondary } = collectAttributes(node);

    // Pick offset level for current node
    const level = state.parent ? 1 : 0;
    out.level += level;

    // Do not indent top-level elements
    if (state.parent || index !== 0) {
        pushNewline(out, true);
    }

    if (node.name && (node.name !== 'div' || !primary.length)) {
        pushString(out, '%' + node.name);
    }

    pushPrimaryAttributes(primary, state);
    pushSecondaryAttributes(secondary, state, '(', ')');

    if (node.selfClosing && !node.value && !node.children.length) {
        pushString(out, '/');
    } else {
        node.children.forEach(next);
    }

    out.level -= level;
}

function collectAttributes(node: AbbreviationNode): AttributesCollection {
    const primary: AbbreviationAttribute[] = [];
    const secondary: AbbreviationAttribute[] = [];

    if (node.attributes) {
        for (const attr of node.attributes) {
            if (isPrimaryAttribute(attr)) {
                primary.push(attr);
            } else {
                secondary.push(attr);
            }
        }
    }

    return { primary, secondary };
}

function isPrimaryAttribute(attr: AbbreviationAttribute): boolean {
    return attr.name === 'class' || attr.name === 'id';
}

function pushPrimaryAttributes(attrs: AbbreviationAttribute[], state: WalkState) {
    for (const attr of attrs) {
        const isClass = attr.name === 'class';
        pushString(state.out, isClass ? '.' : '#');
        if (attr.value) {
            const tokens = isClass
                // All whitespace characters must be replaced with dots in class names
                ? attr.value.map(t => typeof t === 'string' ? t.replace(/\s+/g, '.') : t)
                : attr.value;
            pushTokens(tokens, state);
        }
    }
}

function pushSecondaryAttributes(attrs: AbbreviationAttribute[], state: WalkState, before = '', after = '') {
    if (attrs.length) {
        const { out, profile } = state;

        pushString(out, before);

        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            pushString(out, profile.attribute(attr.name || ''));
            if (profile.isBooleanAttribute(attr) && !attr.value) {
                if (!profile.get('compactBoolean')) {
                    pushString(out, '=true');
                }
            } else {
                pushString(out, '=' + profile.quoteChar);
                pushTokens(attr.value || caret, state);
                pushString(out, profile.quoteChar);
            }

            if (i !== attrs.length - 1) {
                pushString(out, ' ');
            }
        }

        pushString(out, after);
    }
}
