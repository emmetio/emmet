import { AbbreviationNode } from '@emmetio/abbreviation';
import { ResolvedConfig } from '../types';
import { isNode, Container } from './utils';

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

export default function implicitTag(node: AbbreviationNode, ancestors: Container[], config: ResolvedConfig) {
    if (!node.name && node.attributes) {
        const parent = getParentElement(ancestors);
        const parentName = (parent && parent.name || '').toLowerCase();
        node.name = elementMap[parentName]
            || (config.profile.isInline(parentName) ? 'span' : 'div');
    }
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
