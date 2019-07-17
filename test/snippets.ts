// import { fail } from 'assert';
import parseMarkup from '@emmetio/abbreviation';
// import parseStylesheet from '@emmetio/css-abbreviation';
import SnippetsRegistry from '../src/SnippetsRegistry';
import html from '../snippets/html.json';
// import css from '../snippets/css.json';
import xsl from '../snippets/xsl.json';

function markup(abbr: string) {
    parseMarkup(abbr);
    // try {
    // } catch (err) {
    //     fail(`Unable to parse markup abbreviation "${abbr}": ${err.message}`);
    // }
}

// function stylesheet(abbr: string) {
//     try {
//         parseStylesheet(abbr);
//     } catch (err) {
//         fail(`Unable to parse stylesheet abbreviation "${abbr}": ${err.message}`);
//     }
// }

describe('Snippets', () => {
    it('HTML', () => {
        const snippets = new SnippetsRegistry(html);
        snippets.values().forEach(s => markup(s.value as string));
    });

    it('XSL', () => {
        const snippets = new SnippetsRegistry(xsl);
        snippets.values().forEach(s => markup(s.value as string));
    });

    // it('CSS', () => {
    //     const snippets = new SnippetsRegistry(css);
    //     snippets.values().forEach(s => stylesheet(s.key as string));
    // });
});
