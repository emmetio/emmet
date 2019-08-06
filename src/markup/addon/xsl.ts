import { AbbreviationNode, AbbreviationAttribute } from '@emmetio/abbreviation';

/**
 * XSL transformer: removes `select` attributes from certain nodes that contain
 * children
 */
export default function xsl(node: AbbreviationNode) {
    if (matchesName(node.name) && node.attributes && (node.children.length || node.value)) {
        node.attributes = node.attributes.filter(isAllowed);
    }
}

function isAllowed(attr: AbbreviationAttribute): boolean {
    return attr.name !== 'select';
}

function matchesName(name?: string): boolean {
    return name === 'xsl:variable' || name === 'xsl:with-param';
}
