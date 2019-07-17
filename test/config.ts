import { equal, strictEqual } from 'assert';
import resolveConfig from '../src/config';
import { RawConfig } from '../src/types';
import configJSON from './assets/sample-config.json';

describe('Config resolver', () => {
    const defaultConfig = configJSON as any as RawConfig;
    describe('Markup', () => {
        it('should resolve globals', () => {
            const conf = resolveConfig({ type: 'markup' }, defaultConfig);

            equal(conf.type, 'markup');
            equal(conf.syntax, 'html');
            equal(conf.options.comment!.enabled, true);

            equal(conf.profile.options.tagCase, 'upper');
            equal(conf.profile.options.attributeCase, 'upper');

            equal(conf.options.jsx, true);
            equal(conf.options.bem!.element, '_el');

            equal(conf.variables.lang, 'ru');

            equal(conf.snippets.get('a')!.value, 'a[href title]');
        });

        it('should resolve syntax-specific config', () => {
            const conf = resolveConfig({ syntax: 'angular' }, defaultConfig);

            equal(conf.type, 'markup');
            equal(conf.syntax, 'angular');

            equal(conf.options.comment!.enabled, false);

            equal(conf.profile.options.tagCase, 'lower');
            equal(conf.profile.options.attributeCase, 'upper');
            equal(conf.snippets.get('sw')!.value, 'div[[ngSwitch]]');

            // should inherit from global 'markup' section
            equal(conf.snippets.get('a')!.value, 'a[href title]');
        });

        it('should resolve project-specific config', () => {
            const conf = resolveConfig({
                syntax: 'angular',
                project: 'proj1'
            }, defaultConfig);

            equal(conf.type, 'markup');
            equal(conf.syntax, 'angular');

            equal(conf.options.comment!.enabled, false);

            // Global syntax-specific config should take precedence over global
            // project-specific section
            equal(conf.profile.options.tagCase, 'lower');
            equal(conf.profile.options.attributeCase, 'upper');
            equal(conf.profile.options.format, false);
            equal(conf.snippets.get('p1s')!.value, 'div.proj1-snippet');

            // should inherit from global 'markup' section
            equal(conf.snippets.get('sw')!.value, 'div[[ngSwitch]]');
            equal(conf.snippets.get('a')!.value, 'a[href title]');
        });
    });

    describe('Stylesheet', () => {
        it('should resolve globals', () => {
            const conf = resolveConfig({ type: 'stylesheet' }, defaultConfig);

            equal(conf.type, 'stylesheet');
            equal(conf.syntax, 'css');
            equal(conf.options.shortHex, true);
            equal(conf.options.between, ':');

            equal(conf.profile.options.tagCase, 'upper');
            equal(conf.profile.options.format, false);

            equal(conf.snippets.get('gd')!.value, 'grid');
        });

        it('should resolve syntax-specific config', () => {
            const conf = resolveConfig({ syntax: 'sugarss' }, defaultConfig);

            equal(conf.type, 'stylesheet');
            equal(conf.syntax, 'sugarss');

            // Inherit from "markup" globals
            equal(conf.options.shortHex, true);

            equal(conf.options.between, ' ');
            equal(conf.options.after, '');

            equal(conf.snippets.get('gd')!.value, 'grid');
            equal(conf.snippets.get('foo')!.value, 'bar');
        });

        it('should resolve project-specific config', () => {
            const conf = resolveConfig({
                syntax: 'sugarss',
                project: 'proj1'
            }, defaultConfig);

            equal(conf.type, 'stylesheet');
            equal(conf.syntax, 'sugarss');

            equal(conf.options.shortHex, true);
            equal(conf.options.between, ' ');
            equal(conf.options.after, '');

            equal(conf.snippets.get('gd')!.value, 'baz');
            equal(conf.snippets.get('foo')!.value, 'bar');
        });
    });

    it('known & unknown syntaxes', () => {
        let conf = resolveConfig({ syntax: 'pug' }, defaultConfig);
        equal(conf.type, 'markup');
        equal(conf.syntax, 'pug');

        conf = resolveConfig({ syntax: 'foo' }, defaultConfig);
        strictEqual(conf.type, 'markup');
        equal(conf.syntax, 'foo');
    });
});
