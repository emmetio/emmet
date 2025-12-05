import { describe, it } from 'node:test';
import { strictEqual as equal, deepStrictEqual as deepEqual, ok } from 'node:assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AbbreviationTrackerService } from '../src/abbreviation-tracker';
import type { AbbreviationTracker } from '../src/types';

function doc(content: string, languageId = 'html', uri = 'file:///test.html'): TextDocument {
    return TextDocument.create(uri, languageId, 1, content);
}

/** Runs debounced tracking and resolves with the resulting tracker */
function track(
    service: AbbreviationTrackerService,
    document: TextDocument,
    position?: { line: number, character: number }
): Promise<AbbreviationTracker | null> {
    return new Promise(resolve => service.trackAbbreviations(document, position, resolve));
}

describe('Abbreviation Tracker', () => {
    describe('Extraction', () => {
        it('tracks markup abbreviation at cursor', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3');
            const tracker = await track(service, document, { line: 0, character: 7 });

            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
            equal(tracker.documentUri, document.uri);
            deepEqual(tracker.range, {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 7 }
            });

            // Expansion is filled in later, by the server’s validation pass
            equal(tracker.expanded, '');
            equal(tracker.isValid, false);
        });

        it('tracks abbreviation in the middle of a line', async () => {
            const service = new AbbreviationTrackerService(0);
            const tracker = await track(service, doc('  <div>ul>li*3'), { line: 0, character: 14 });

            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
            deepEqual(tracker.range, {
                start: { line: 0, character: 7 },
                end: { line: 0, character: 14 }
            });
        });

        it('tracks on the requested line only', async () => {
            const service = new AbbreviationTrackerService(0);
            const tracker = await track(service, doc('first\nul>li*3\nlast'), { line: 1, character: 7 });

            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
            equal(tracker.range.start.line, 1);
            equal(tracker.range.end.line, 1);
        });

        it('tracks stylesheet abbreviation', async () => {
            const service = new AbbreviationTrackerService(0);
            const tracker = await track(service, doc('m10', 'css', 'file:///test.css'), { line: 0, character: 3 });

            ok(tracker);
            equal(tracker.abbreviation, 'm10');
        });

        it('ignores unsupported languages', async () => {
            const service = new AbbreviationTrackerService(0);
            const tracker = await track(service, doc('ul>li*3', 'markdown', 'file:///test.md'), { line: 0, character: 7 });
            equal(tracker, null);
        });

        it('ignores too short abbreviations', async () => {
            const service = new AbbreviationTrackerService(0);
            equal(await track(service, doc('a'), { line: 0, character: 1 }), null);
            equal(await track(service, doc(''), { line: 0, character: 0 }), null);
        });

        it('falls back to stored cursor position', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3\nsecond');

            service.initializeDocument(document.uri);
            service.updateCursorPosition(document.uri, { line: 0, character: 7 });

            const tracker = await track(service, document);
            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
            equal(tracker.range.start.line, 0);
        });

        it('falls back to end of document without cursor position', async () => {
            const service = new AbbreviationTrackerService(0);
            const tracker = await track(service, doc('first\nul>li*3'));

            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
            equal(tracker.range.end.line, 1);
        });
    });

    describe('Document state', () => {
        it('collects abbreviations per document', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3');

            equal(service.getCurrentTracker(document.uri), null);
            deepEqual(service.getDocumentAbbreviations(document.uri), []);

            await track(service, document, { line: 0, character: 7 });

            equal(service.getDocumentAbbreviations(document.uri).length, 1);
            equal(service.getCurrentTracker(document.uri)?.abbreviation, 'ul>li*3');
        });

        it('keeps no more than 10 abbreviations', async () => {
            const service = new AbbreviationTrackerService(0);
            const line = 'div'.repeat(20);
            const document = doc(line);

            for (let i = 3; i <= 20; i++) {
                await track(service, document, { line: 0, character: i });
            }

            equal(service.getDocumentAbbreviations(document.uri).length, 10);
        });

        it('cleans up on close', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3');

            await track(service, document, { line: 0, character: 7 });
            deepEqual(service.getStats(), {
                documentsTracked: 1,
                totalAbbreviations: 1,
                activeTimers: 0
            });

            service.closeDocument(document.uri);
            equal(service.getCurrentTracker(document.uri), null);
            deepEqual(service.getStats(), {
                documentsTracked: 0,
                totalAbbreviations: 0,
                activeTimers: 0
            });
        });

        it('drops pending timer on close', async () => {
            const service = new AbbreviationTrackerService(50);
            const document = doc('ul>li*3');
            let called = false;

            service.trackAbbreviations(document, { line: 0, character: 7 }, () => { called = true; });
            equal(service.getStats().activeTimers, 1);

            service.closeDocument(document.uri);
            await sleep(80);

            equal(called, false);
            equal(service.getStats().totalAbbreviations, 0);
        });

        it('debounces rapid updates', async () => {
            const service = new AbbreviationTrackerService(30);
            const document = doc('ul>li*3');
            const seen: (string | null)[] = [];
            const collect = (tracker: AbbreviationTracker | null) => seen.push(tracker?.abbreviation ?? null);

            service.trackAbbreviations(document, { line: 0, character: 2 }, collect);
            service.trackAbbreviations(document, { line: 0, character: 5 }, collect);
            service.trackAbbreviations(document, { line: 0, character: 7 }, collect);

            await sleep(60);

            deepEqual(seen, ['ul>li*3']);
            equal(service.getStats().activeTimers, 0);
        });
    });

    describe('Tracking guards', () => {
        const service = new AbbreviationTrackerService(0);

        it('enabled in plain markup', () => {
            equal(service.isTrackingEnabled(doc('ul>li*3'), { line: 0, character: 7 }), true);
        });

        it('disabled for unsupported language', () => {
            const document = doc('ul>li*3', 'markdown', 'file:///test.md');
            equal(service.isTrackingEnabled(document, { line: 0, character: 7 }), false);
        });

        it('disabled inside comments', () => {
            const html = doc('<!-- ul>li*3');
            equal(service.isTrackingEnabled(html, { line: 0, character: 12 }), false);
            equal(service.isTrackingEnabled(doc('<!-- x --> ul>li*3'), { line: 0, character: 18 }), true);

            const css = doc('/* m10', 'css', 'file:///test.css');
            equal(service.isTrackingEnabled(css, { line: 0, character: 6 }), false);

            const js = doc('// ul>li*3', 'javascript', 'file:///test.js');
            equal(service.isTrackingEnabled(js, { line: 0, character: 10 }), false);
        });

        it('disabled inside strings', () => {
            equal(service.isTrackingEnabled(doc('<div class="ul>li*3'), { line: 0, character: 19 }), false);
            equal(service.isTrackingEnabled(doc('<div class="a">ul>li*3'), { line: 0, character: 22 }), true);
        });
    });
});

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
