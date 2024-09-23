import { describe, it } from 'node:test';
import { ok, strictEqual as equal } from 'node:assert';
import markup from '@emmetio/abbreviation';
import expand from '../src';
import html from '../src/snippets/html.json' assert { type: 'json' };
import xsl from '../src/snippets/xsl.json' assert { type: 'json' };

describe('Snippets', () => {
    it('HTML', () => {
        Object.keys(html).forEach(k => ok(markup(html[k]), k));
        equal(expand('fset>input:c'), '<fieldset><input type="checkbox" name="" id=""></fieldset>');
    });

    it('XSL', () => {
        Object.keys(xsl).forEach(k => ok(markup(xsl[k]), k));
    });

    it('Invalid snippets', () => {
        const snippets = {
            invalid: 'invalid snippet',
            valid: 'button'
        }

        const result = expand('invalid+valid', { snippets })
        equal(result, '<invalid></invalid>\n<button></button>')
    });
});
