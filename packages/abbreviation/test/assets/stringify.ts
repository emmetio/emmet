import Node from '@emmetio/node';

export default function stringify(node: Node): string {
    const children = node.children.map(stringify).join('');

    if (!node.parent && node.isGroup) {
        // a root container: return its content only
        return children;
    } else if (node.isGroup) {
        // grouping node
        return `(${children})${counter(node)}`;
    } else if (node.value && !node.name && !node.attributes.length) {
        // text node
        return node.value;
    }

    const attr = node.attributes.map(a => ` ${a.name}="${a.value || ''}"`).join('');
    const name = node.name || '?';

    return node.selfClosing
        ? `<${name}${counter(node)}${attr} />`
        : `<${name}${counter(node)}${attr}>${node.value || ''}${children}</${name}>`;
}

function counter(node: Node): string {
    if (!node.repeat) {
        return '';
    }

    let out = `*${node.repeat.count}`;
    if (node.repeat.value != null) {
        out += `@${node.repeat.value}`;
    }

    return out;
}
