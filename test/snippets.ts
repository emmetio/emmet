import { ok, strictEqual as equal } from 'assert';
import markup from '@emmetio/abbreviation';
import expand from '../src';
import html from '../snippets/html.json';
import xsl from '../snippets/xsl.json';

describe('Snippets', () => {
    it('HTML', () => {
        Object.keys(html).forEach(k => ok(markup(html[k]), k));
        equal(expand('fset>input:c'), '<fieldset><input type="checkbox" name="" id=""></fieldset>');
    });

    it('XSL', () => {
        Object.keys(xsl).forEach(k => ok(markup(xsl[k]), k));
    });
});
