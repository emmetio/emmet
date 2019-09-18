import { AbbreviationNode } from '@emmetio/abbreviation';
import { isNode, Container } from './utils';
import { Config } from '../config';
import { isInline } from '../output-stream';

const elementMap: { [name: string]: string } = {
    p: 'span',
    ul: 'li',
    ol: 'li',
    table: 'tr',
    tr: 'td',
    tbody: 'tr',
    thead: 'tr',
    tfoot: 'tr',
    colgroup: 'col',
    select: 'option',
    optgroup: 'option',
    audio: 'source',
    video: 'source',
    object: 'param',
    map: 'area'
};

export default function implicitTag(node: AbbreviationNode, ancestors: Container[], config: Config) {
    if (!node.name && node.attributes) {
        resolveImplicitTag(node, ancestors, config);
    }
}

export function resolveImplicitTag(node: AbbreviationNode, ancestors: Container[], config: Config) {
    const parent = getParentElement(ancestors);
    const contextName = config.context ? config.context.name : '';
    const parentName = lowercase(parent ? parent.name : contextName);
    node.name = elementMap[parentName]
        || (isInline(parentName, config) ? 'span' : 'div');
}

function lowercase(str?: string): string {
    return (str || '').toLowerCase();
}

/**
 * Returns closest element node from given ancestors list
 */
function getParentElement(ancestors: Container[]): AbbreviationNode | undefined {
    for (let i = ancestors.length - 1; i >= 0; i--) {
        const elem = ancestors[i];
        if (isNode(elem)) {
            return elem;
        }
    }
}
