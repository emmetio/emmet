import { equal, strictEqual } from 'assert';
import SnippetsRegistry from '@emmetio/snippets-registry';
import resolveConfig from '../index';
// tslint:disable-next-line: no-var-requires
const defaultConfig = require('./sample-config.json');

describe('Config resolver', () => {
    describe('Markup', () => {
        it('should resolve globals', () => {
            const conf = resolveConfig(defaultConfig, { type: 'markup' });
            const registry = new SnippetsRegistry(conf.snippets);

            equal(conf.type, 'markup');
            equal(conf.syntax, 'html');
            equal(conf.options!.comment!.enabled, true);

            equal(conf.profile.tagCase, 'upper');
            equal(conf.profile.attributeCase, 'upper');

            equal(conf.options!.jsx, true);
            equal(conf.options!.bem!.element, '_el');

            equal(conf.variables!.lang, 'ru');

            equal(registry.resolve('a')!.value, 'a[href title]');
        });

        it('should resolve syntax-specific config', () => {
            const conf = resolveConfig(defaultConfig, { syntax: 'angular' });
            const registry = new SnippetsRegistry(conf.snippets);

            equal(conf.type, 'markup');
            equal(conf.syntax, 'angular');

            equal(conf.options!.comment!.enabled, false);

            equal(conf.profile.tagCase, 'lower');
            equal(conf.profile.attributeCase, 'upper');
            equal(registry.resolve('sw')!.value, 'div[[ngSwitch]]');

            // should inherit from global 'markup' section
            equal(registry.resolve('a')!.value, 'a[href title]');
        });

        it('should resolve project-specific config', () => {
            const conf = resolveConfig(defaultConfig, {
                syntax: 'angular',
                project: 'proj1'
            });
            const registry = new SnippetsRegistry(conf.snippets);

            equal(conf.type, 'markup');
            equal(conf.syntax, 'angular');

            equal(conf.options!.comment!.enabled, false);

            // Global syntax-specific config should take precedence over global
            // project-specific section
            equal(conf.profile.tagCase, 'lower');
            equal(conf.profile.attributeCase, 'upper');
            equal(conf.profile.format, false);
            equal(registry.resolve('p1s')!.value, 'div.proj1-snippet');

            // should inherit from global 'markup' section
            equal(registry.resolve('sw')!.value, 'div[[ngSwitch]]');
            equal(registry.resolve('a')!.value, 'a[href title]');
        });
    });

    describe('Stylesheet', () => {
        it('should resolve globals', () => {
            const conf = resolveConfig(defaultConfig, { type: 'stylesheet' });
            const registry = new SnippetsRegistry(conf.snippets);

            equal(conf.type, 'stylesheet');
            equal(conf.syntax, 'css');
            equal(conf.options!.shortHex, true);
            equal(conf.options!.between, ':');

            equal(conf.profile.tagCase, 'upper');
            equal(conf.profile.format, false);

            equal(registry.resolve('gd')!.value, 'grid');
        });

        it('should resolve syntax-specific config', () => {
            const conf = resolveConfig(defaultConfig, { syntax: 'sugarss' });
            const registry = new SnippetsRegistry(conf.snippets);

            equal(conf.type, 'stylesheet');
            equal(conf.syntax, 'sugarss');

            // Inherit from "markup" globals
            equal(conf.options!.shortHex, true);

            equal(conf.options!.between, ' ');
            equal(conf.options!.after, '');

            equal(registry.resolve('gd')!.value, 'grid');
            equal(registry.resolve('foo')!.value, 'bar');
        });

        it('should resolve project-specific config', () => {
            const conf = resolveConfig(defaultConfig, {
                syntax: 'sugarss',
                project: 'proj1'
            });
            const registry = new SnippetsRegistry(conf.snippets);

            equal(conf.type, 'stylesheet');
            equal(conf.syntax, 'sugarss');

            equal(conf.options!.shortHex, true);
            equal(conf.options!.between, ' ');
            equal(conf.options!.after, '');

            equal(registry.resolve('gd')!.value, 'baz');
            equal(registry.resolve('foo')!.value, 'bar');
        });
    });

    // it('preserve extra fields', () => {
    //     const conf = resolveConfig(Object.assign({
    //         field(index, placeholder) {
    //             return `\${${index}:${placeholder}}`;
    //         }
    //     }, defaultConfig));

    //     equal(conf.version, 1);
    //     ok(typeof conf.field === 'function');
    // });

    it('known & unknown syntaxes', () => {
        let conf = resolveConfig(defaultConfig, { syntax: 'pug' });
        equal(conf.type, 'markup');
        equal(conf.syntax, 'pug');

        conf = resolveConfig(defaultConfig, { syntax: 'foo' });
        strictEqual(conf.type, 'markup');
        equal(conf.syntax, 'foo');
    });
});
