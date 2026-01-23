import { describe, it } from 'node:test';
import { strictEqual as equal, notStrictEqual as notEqual, ok } from 'node:assert';
import { EmmetConfigCache, expand } from '../src/config';
import type { EmmetSettings } from '../src/types';

function settings(overrides: Partial<EmmetSettings> = {}): EmmetSettings {
    return { preferences: {}, variables: {}, ...overrides } as EmmetSettings;
}

describe('Emmet Config Cache', () => {
    it('expands according to language syntax', () => {
        const cache = new EmmetConfigCache();

        equal(expand('m10', cache.resolve('css', settings())), 'margin: 10px;');
        equal(expand('ul>li', cache.resolve('html', settings())), '<ul>\n\t<li></li>\n</ul>');
    });

    it('reuses a resolved config per language and settings', () => {
        const cache = new EmmetConfigCache();
        const current = settings();

        const config = cache.resolve('html', current);
        equal(cache.resolve('html', current), config);
        notEqual(cache.resolve('css', current), config);
        notEqual(cache.resolve('html', settings()), config);
    });

    it('applies user preferences', () => {
        const cache = new EmmetConfigCache();
        const config = cache.resolve('html', settings({
            preferences: { 'output.selfClosingStyle': 'xhtml' }
        }));

        ok(expand('img', config).includes('/>'));
    });

    it('picks up settings changed in place after clear()', () => {
        const cache = new EmmetConfigCache();

        // Without the configuration capability the server updates its settings
        // object in place, so identity alone can’t tell the config is stale
        const current = settings();
        equal(expand('img', cache.resolve('html', current)).includes('/>'), false);

        current.preferences = { 'output.selfClosingStyle': 'xhtml' };
        cache.clear();

        ok(expand('img', cache.resolve('html', current)).includes('/>'));
    });
});
