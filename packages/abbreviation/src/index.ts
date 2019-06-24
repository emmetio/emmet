import Node from '@emmetio/node';
import parse from './parser';

/**
 * Parses given abbreviation and un-rolls it into a full tree: recursively
 * replaces repeated elements with actual nodes
 */
export default function parseAbbreviation(abbr: string): Node {
    const tree = parse(abbr);
    tree.walk(unroll);
    return tree;
}

function unroll(node: Node) {
    if (!node.repeat || !node.repeat.count) {
        return;
    }

    for (let i = 0; i < node.repeat.count; i++) {
        const clone = node.clone(true);
        clone.repeat!.value = i + 1;
        clone.walk(unroll);
        if (clone.isGroup) {
            while (clone.children.length > 0) {
                clone.firstChild!.repeat = clone.repeat;
                node.parent!.insertBefore(clone.firstChild!, node);
            }
        } else {
            node.parent!.insertBefore(clone, node);
        }
    }

    node.parent!.removeChild(node);
}
