import { Abbreviation, AbbreviationNode, Value, AbbreviationAttribute } from '../../src/index.js';

export default function stringify(abbr: Abbreviation): string {
    return abbr.children.map(elem).join('');
}

function elem(node: AbbreviationNode): string {
    const name = node.name || '?';
    const attributes = node.attributes
        ? node.attributes.map(attr => ' ' + attribute(attr))
        : '';
    const value = node.value ? stringifyValue(node.value) : '';
    const repeat = node.repeat ? `*${node.repeat.count}@${node.repeat.value}` : '';

    return node.selfClosing && !node.value && !node.children.length
        ? `<${name}${repeat}${attributes} />`
        : `<${name}${repeat}${attributes}>${value}${node.children.map(elem).join('')}</${name}>`;

}

function attribute(attr: AbbreviationAttribute): string {
    const name = attr.name || '?';
    const value = attr.value ? `"${stringifyValue(attr.value)}"` : null;
    return value != null ? `${name}=${value}` : name;
}

function stringifyValue(items: Value[]): string {
    return items.map(item =>
        typeof item === 'string'
            ? item
            : (item.name ? `\${${item.index!}:${item.name}}` : `\${${item.index!}}`)).join('');
}
