import { ok } from 'assert';
import markup from '@emmetio/abbreviation';
import html from '../snippets/html.json';
import xsl from '../snippets/xsl.json';

describe('Snippets', () => {
    it('HTML', () => {
        Object.keys(html).forEach(k => ok(markup(html[k]), k));
    });

    it('XSL', () => {
        Object.keys(xsl).forEach(k => ok(markup(xsl[k]), k));
    });
});
