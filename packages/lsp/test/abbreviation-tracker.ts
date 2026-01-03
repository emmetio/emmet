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

            deepEqual(tracker, {
                abbreviation: 'ul>li*3',
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 7 }
                },
                documentUri: document.uri
            });
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

        it('ignores the line ending of CRLF documents', async () => {
            const service = new AbbreviationTrackerService(0);
            const tracker = await track(service, doc('ul>li*3\r\nsecond'), { line: 0, character: 7 });

            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
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
    });

    describe('Cursor position', () => {
        it('uses the cursor position reported by the client', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3\nsecond');

            service.updateCursorPosition(document.uri, { line: 0, character: 7 });

            const tracker = await track(service, document);
            ok(tracker);
            equal(tracker.abbreviation, 'ul>li*3');
            equal(tracker.range.start.line, 0);
        });

        it('does not track without a known cursor position', async () => {
            const service = new AbbreviationTrackerService(0);

            // Would otherwise pick up plain text at the end of a freshly opened
            // document and report it as an abbreviation
            equal(await track(service, doc('<p>Hello world')), null);
            equal(await track(service, doc('first\nul>li*3')), null);
        });

        it('drops a cursor position the document no longer has', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3');

            service.updateCursorPosition(document.uri, { line: 0, character: 20 });
            equal(await track(service, document), null);

            service.updateCursorPosition(document.uri, { line: 5, character: 0 });
            equal(await track(service, document), null);
        });
    });

    describe('Comments and strings', () => {
        it('does not track inside comments', async () => {
            const service = new AbbreviationTrackerService(0);

            equal(await track(service, doc('<!-- ul>li*3'), { line: 0, character: 12 }), null);
            ok(await track(service, doc('<!-- x --> ul>li*3'), { line: 0, character: 18 }));

            const css = doc('/* m10', 'css', 'file:///test.css');
            equal(await track(service, css, { line: 0, character: 6 }), null);

            const js = doc('// ul>li*3', 'javascript', 'file:///test.js');
            equal(await track(service, js, { line: 0, character: 10 }), null);
        });

        it('does not track inside strings', async () => {
            const service = new AbbreviationTrackerService(0);

            equal(await track(service, doc('<div class="ul>li*3'), { line: 0, character: 19 }), null);
            ok(await track(service, doc('<div class="a">ul>li*3'), { line: 0, character: 22 }));
        });
    });

    describe('Document state', () => {
        it('keeps the abbreviation at the current cursor position', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3');

            equal(service.getCurrentTracker(document.uri), null);

            await track(service, document, { line: 0, character: 7 });
            equal(service.getCurrentTracker(document.uri)?.abbreviation, 'ul>li*3');

            // Tracking elsewhere replaces it instead of piling up
            await track(service, document, { line: 0, character: 2 });
            equal(service.getCurrentTracker(document.uri)?.abbreviation, 'ul');
            equal(service.getStats().activeTrackers, 1);

            await track(service, document, { line: 0, character: 1 });
            equal(service.getCurrentTracker(document.uri), null);
            equal(service.getStats().activeTrackers, 0);
        });

        it('cleans up on close', async () => {
            const service = new AbbreviationTrackerService(0);
            const document = doc('ul>li*3');

            await track(service, document, { line: 0, character: 7 });
            deepEqual(service.getStats(), {
                documentsTracked: 1,
                activeTrackers: 1,
                activeTimers: 0
            });

            service.closeDocument(document.uri);
            equal(service.getCurrentTracker(document.uri), null);
            deepEqual(service.getStats(), {
                documentsTracked: 0,
                activeTrackers: 0,
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
            equal(service.getStats().activeTrackers, 0);
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
});

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
