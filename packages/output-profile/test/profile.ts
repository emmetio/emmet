import { strictEqual } from 'assert';
import Profile from '../index';

describe('Profile', () => {
    it('tag name', () => {
        let profile = new Profile({ tagCase: '' });
        strictEqual(profile.name('Foo'), 'Foo');
        strictEqual(profile.name('bAr'), 'bAr');

        profile = new Profile({tagCase: 'upper'});
        strictEqual(profile.name('Foo'), 'FOO');
        strictEqual(profile.name('bAr'), 'BAR');

        profile = new Profile({tagCase: 'lower'});
        strictEqual(profile.name('Foo'), 'foo');
        strictEqual(profile.name('bAr'), 'bar');
    });

    it('attribute name', () => {
        let profile = new Profile({ attributeCase: '' });
        strictEqual(profile.attribute('Foo'), 'Foo');
        strictEqual(profile.attribute('bAr'), 'bAr');

        profile = new Profile({attributeCase: 'upper'});
        strictEqual(profile.attribute('Foo'), 'FOO');
        strictEqual(profile.attribute('bAr'), 'BAR');

        profile = new Profile({ attributeCase: 'lower' });
        strictEqual(profile.attribute('Foo'), 'foo');
        strictEqual(profile.attribute('bAr'), 'bar');
    });

    it('self close', () => {
        let profile = new Profile({selfClosingStyle: 'html'});
        strictEqual(profile.selfClose(), '');

        profile = new Profile({selfClosingStyle: 'xhtml'});
        strictEqual(profile.selfClose(), ' /');

        profile = new Profile({selfClosingStyle: 'xml'});
        strictEqual(profile.selfClose(), '/');
    });

    it('indentation', () => {
        let profile = new Profile({ indent: '\t' });
        strictEqual(profile.indent(), '');
        strictEqual(profile.indent(1), '\t');
        strictEqual(profile.indent(3), '\t\t\t');

        profile = new Profile({indent: '  '});
        strictEqual(profile.indent(), '');
        strictEqual(profile.indent(1), '  ');
        strictEqual(profile.indent(3), '      ');
    });

    it('inline elements', () => {
        const profile = new Profile();
        strictEqual(profile.isInline('a'), true);
        strictEqual(profile.isInline('b'), true);
        strictEqual(profile.isInline('c'), false);
    });
});
