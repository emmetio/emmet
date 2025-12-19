import { after, describe, it } from 'node:test';
import { strictEqual as equal, deepStrictEqual as deepEqual, ok } from 'node:assert';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { EmmetCompletionProvider } from '../src/completion-provider';
import { abbreviationTracker } from '../src/abbreviation-tracker';
import type { EmmetCompletionData, EmmetSettings } from '../src/types';

function doc(content: string, languageId = 'html', uri = 'file:///test.html'): TextDocument {
    return TextDocument.create(uri, languageId, 1, content);
}

function settings(overrides: Partial<EmmetSettings> = {}): EmmetSettings {
    return {
        enabled: true,
        showExpandedPreview: true,
        showSuggestionsAsSnippets: true,
        includeLanguages: {},
        variables: {},
        syntaxProfiles: {},
        preferences: {},
        excludeLanguages: ['markdown'],
        extensionsPath: [],
        triggerExpansionOnTab: true,
        useNewEmmet: true,
        showAbbreviationSuggestions: true,
        optimizeStylesheetParsing: true,
        ...overrides
    };
}

// The provider notifies the shared tracker, which schedules debounced timers
after(() => {
    abbreviationTracker.closeDocument('file:///test.html');
    abbreviationTracker.closeDocument('file:///test.css');
});

describe('Completion Provider', () => {
    describe('Abbreviation completions', () => {
        it('expands markup abbreviation', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideCompletions(doc('ul>li*3'), { line: 0, character: 7 }, settings());

            equal(items.length, 1);
            const [item] = items;
            ok(item);
            equal(item.label, 'ul>li*3');
            equal(item.filterText, 'ul>li*3');
            equal(item.insertText, '<ul>\n\t<li></li>\n\t<li></li>\n\t<li></li>\n</ul>');
            equal(item.preselect, true);
            deepEqual(item.commitCharacters, ['\t', '\n']);
        });

        it('replaces the abbreviation range', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideCompletions(doc('  <div>ul>li*3'), { line: 0, character: 14 }, settings());

            const [item] = items;
            ok(item?.textEdit);
            deepEqual('range' in item.textEdit ? item.textEdit.range : undefined, {
                start: { line: 0, character: 7 },
                end: { line: 0, character: 14 }
            });
            equal(item.textEdit.newText, item.insertText);
        });

        it('expands stylesheet abbreviation', () => {
            const provider = new EmmetCompletionProvider();
            const document = doc('m10', 'css', 'file:///test.css');
            const items = provider.provideCompletions(document, { line: 0, character: 3 }, settings());

            equal(items.length, 1);
            equal(items[0]?.insertText, 'margin: 10px;');
        });

        it('attaches expansion data for resolve', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideCompletions(doc('ul>li*3'), { line: 0, character: 7 }, settings());
            const data = items[0]?.data as EmmetCompletionData;

            ok(data);
            equal(data.abbreviation, 'ul>li*3');
            equal(data.language, 'html');
            equal(data.syntax, 'markup');
            equal(data.expanded, items[0]?.insertText);
        });

        it('documents the expansion as markdown', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideCompletions(doc('ul>li*3'), { line: 0, character: 7 }, settings());
            const documentation = items[0]?.documentation;

            ok(documentation && typeof documentation !== 'string');
            equal(documentation.kind, 'markdown');
            ok(documentation.value.includes('```html'));
            ok(documentation.value.includes('<li></li>'));
        });

        it('honors snippet setting', () => {
            const provider = new EmmetCompletionProvider();
            const position = { line: 0, character: 7 };

            const asSnippet = provider.provideCompletions(doc('ul>li*3'), position, settings());
            equal(asSnippet[0]?.kind, CompletionItemKind.Snippet);
            equal(asSnippet[0]?.insertTextFormat, InsertTextFormat.Snippet);

            const asText = provider.provideCompletions(doc('ul>li*3'), position, settings({
                showSuggestionsAsSnippets: false
            }));
            equal(asText[0]?.kind, CompletionItemKind.Text);
            equal(asText[0]?.insertTextFormat, InsertTextFormat.PlainText);
        });

        it('applies user preferences and variables', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideCompletions(doc('link:css'), { line: 0, character: 8 }, settings({
                preferences: { 'output.selfClosingStyle': 'xhtml' }
            }));

            ok(items[0]?.insertText?.includes('/>'));
        });

        it('returns nothing when disabled', () => {
            const provider = new EmmetCompletionProvider();
            const position = { line: 0, character: 7 };

            deepEqual(provider.provideCompletions(doc('ul>li*3'), position, settings({ enabled: false })), []);
            deepEqual(provider.provideCompletions(doc('ul>li*3'), position, settings({
                showAbbreviationSuggestions: false
            })), []);
        });

        it('returns nothing for unsupported language', () => {
            const provider = new EmmetCompletionProvider();
            const document = doc('ul>li*3', 'markdown', 'file:///test.md');
            deepEqual(provider.provideCompletions(document, { line: 0, character: 7 }, settings()), []);
        });

        it('returns nothing for too short abbreviation', () => {
            const provider = new EmmetCompletionProvider();
            deepEqual(provider.provideCompletions(doc('a'), { line: 0, character: 1 }, settings()), []);
        });

        it('returns nothing on empty line', () => {
            const provider = new EmmetCompletionProvider();
            deepEqual(provider.provideCompletions(doc(''), { line: 0, character: 0 }, settings()), []);
        });
    });

    describe('Enhanced completions', () => {
        it('adds class suggestions on dot in markup', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideEnhancedCompletions(doc('div.'), { line: 0, character: 4 }, settings(), '.');
            const labels = items.map(item => item.label);

            ok(labels.includes('.container'));
            ok(items.every(item => item.label !== '#app'));
        });

        it('adds id suggestions on hash in markup', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideEnhancedCompletions(doc('div#'), { line: 0, character: 4 }, settings(), '#');

            ok(items.some(item => item.label === '#app'));
        });

        it('adds property suggestions on colon in stylesheet', () => {
            const provider = new EmmetCompletionProvider();
            const document = doc('ma:', 'css', 'file:///test.css');
            const items = provider.provideEnhancedCompletions(document, { line: 0, character: 3 }, settings(), ':');
            const maxWidth = items.find(item => item.label === 'maw:');

            ok(maxWidth);
            equal(maxWidth.kind, CompletionItemKind.Property);
            equal(maxWidth.detail, 'CSS: max-width');
            equal(maxWidth.insertText, 'max-width: ');
        });

        it('suggests properties from Emmet stylesheet snippets', () => {
            const provider = new EmmetCompletionProvider();
            const properties = (prefix: string) => {
                const document = doc(`${prefix}:`, 'css', 'file:///test.css');
                const position = { line: 0, character: prefix.length + 1 };
                return provider.provideEnhancedCompletions(document, position, settings(), ':')
                    .filter(item => item.kind === CompletionItemKind.Property)
                    .map(item => `${item.label} ${item.insertText}`);
            };

            // Beyond the handful of properties the provider used to hardcode
            ok(properties('bdrs').includes('bdrs: border-radius: '));
            ok(properties('gtc').includes('gtc: grid-template-columns: '));

            // Aliases are expanded, both halves of `op|opa` are suggested
            deepEqual(properties('op'), ['op: opacity: ', 'opa: opacity: ']);

            // Snippets that are not property declarations (a comment here) are not suggested
            deepEqual(properties('cm'), []);
        });

        it('needs an abbreviation prefix for property suggestions', () => {
            const provider = new EmmetCompletionProvider();
            const document = doc(':', 'css', 'file:///test.css');
            deepEqual(provider.provideEnhancedCompletions(document, { line: 0, character: 1 }, settings(), ':'), []);
        });

        it('does not mix markup and stylesheet suggestions', () => {
            const provider = new EmmetCompletionProvider();
            const css = doc('.', 'css', 'file:///test.css');
            deepEqual(provider.provideEnhancedCompletions(css, { line: 0, character: 1 }, settings(), '.'), []);

            const html = doc('div:', 'html');
            const items = provider.provideEnhancedCompletions(html, { line: 0, character: 4 }, settings(), ':');
            ok(items.every(item => item.label !== 'm:'));
        });

        it('adds sibling suggestions on combinators', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideEnhancedCompletions(doc('div>'), { line: 0, character: 4 }, settings(), '>');
            const child = items.find(item => item.label === '>div');

            ok(child);
            equal(child.detail, 'Child: div');
            equal(child.insertText, 'div');
        });

        it('adds multiplier suggestions on asterisk', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideEnhancedCompletions(doc('li*'), { line: 0, character: 3 }, settings(), '*');

            ok(items.some(item => item.label === '*2' && item.insertText === '2'));
        });

        it('keeps the abbreviation first and limits the list', () => {
            const provider = new EmmetCompletionProvider();
            // Abbreviation itself plus 10 sibling suggestions, capped at 10
            const items = provider.provideEnhancedCompletions(doc('div>'), { line: 0, character: 4 }, settings(), '>');

            equal(items.length, 10);
            equal(items[0]?.label, 'div>');
        });

        it('falls back to plain completions without trigger character', () => {
            const provider = new EmmetCompletionProvider();
            const items = provider.provideEnhancedCompletions(doc('ul>li*3'), { line: 0, character: 7 }, settings());

            equal(items.length, 1);
            equal(items[0]?.label, 'ul>li*3');
        });
    });
});
