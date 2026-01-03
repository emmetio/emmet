import { after, before, describe, it } from 'node:test';
import { strictEqual as equal, deepStrictEqual as deepEqual, ok } from 'node:assert';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { join } from 'node:path';
import {
    createProtocolConnection,
    CompletionRequest,
    DidCloseTextDocumentNotification,
    DidOpenTextDocumentNotification,
    ExitNotification,
    InitializedNotification,
    InitializeRequest,
    PublishDiagnosticsNotification,
    ShutdownRequest,
    StreamMessageReader,
    StreamMessageWriter,
    TextDocumentSyncKind,
    type CompletionItem,
    type Diagnostic,
    type InitializeResult,
    type ProtocolConnection
} from 'vscode-languageserver-protocol/node';

const packageRoot = join(__dirname, '..');
const serverEntry = join(packageRoot, 'src', 'server.ts');

const uri = 'file:///protocol-test.html';

describe('LSP Server', () => {
    let child: ChildProcessWithoutNullStreams;
    let connection: ProtocolConnection;
    let initializeResult: InitializeResult;
    const diagnostics = new Map<string, Diagnostic[]>();

    before(async () => {
        // Run the server straight from TypeScript sources, no build step required
        child = spawn(process.execPath, ['--import', 'tsx', serverEntry, '--stdio'], {
            cwd: packageRoot,
            stdio: 'pipe'
        });
        child.stderr.on('data', data => console.error('[server]', String(data).trim()));

        connection = createProtocolConnection(
            new StreamMessageReader(child.stdout),
            new StreamMessageWriter(child.stdin)
        );
        connection.onNotification(PublishDiagnosticsNotification.type, params => {
            diagnostics.set(params.uri, params.diagnostics);
        });
        connection.listen();

        initializeResult = await connection.sendRequest(InitializeRequest.type, {
            processId: process.pid,
            rootUri: null,
            // Deliberately no `workspace.configuration`: the server then serves its
            // own default settings instead of pulling them from the client
            capabilities: {
                textDocument: {
                    completion: { completionItem: { snippetSupport: true } }
                }
            },
            workspaceFolders: null
        });

        connection.sendNotification(InitializedNotification.type, {});
    });

    after(async () => {
        await connection.sendRequest(ShutdownRequest.type, undefined);
        connection.sendNotification(ExitNotification.type, undefined);
        connection.dispose();

        await new Promise<void>(resolve => {
            child.once('exit', () => resolve());
            setTimeout(() => {
                child.kill();
                resolve();
            }, 2000).unref();
        });
    });

    it('announces capabilities', () => {
        const { capabilities } = initializeResult;

        deepEqual(capabilities.textDocumentSync, {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
            willSaveWaitUntil: false,
            save: { includeText: false }
        });

        ok(capabilities.completionProvider);
        equal(capabilities.completionProvider.resolveProvider, true);

        const triggerCharacters = capabilities.completionProvider.triggerCharacters ?? [];
        for (const char of ['>', '+', '.', '#', '*', ':']) {
            ok(triggerCharacters.includes(char), `missing trigger character ${char}`);
        }

        ok(capabilities.codeActionProvider);
        ok(capabilities.diagnosticProvider);
    });

    it('completes an abbreviation in an open document', async () => {
        connection.sendNotification(DidOpenTextDocumentNotification.type, {
            textDocument: { uri, languageId: 'html', version: 1, text: 'ul>li*3' }
        });

        const result = await connection.sendRequest(CompletionRequest.type, {
            textDocument: { uri },
            position: { line: 0, character: 7 }
        });

        const items = (Array.isArray(result) ? result : result?.items ?? []) as CompletionItem[];
        const item = items.find(entry => entry.label === 'ul>li*3');

        ok(item, 'no completion for abbreviation');
        equal(item.insertText, '<ul>\n\t<li></li>\n\t<li></li>\n\t<li></li>\n</ul>');
    });

    it('reports no abbreviations in a freshly opened document', async () => {
        // Plain text at the end of the document used to be reported as an
        // abbreviation the user never typed
        const plainUri = 'file:///plain-text.html';

        connection.sendNotification(DidOpenTextDocumentNotification.type, {
            textDocument: { uri: plainUri, languageId: 'html', version: 1, text: '<p>Hello world' }
        });

        await new Promise<void>(resolve => { setTimeout(resolve, 500).unref(); });

        deepEqual(diagnostics.get(plainUri), []);

        connection.sendNotification(DidCloseTextDocumentNotification.type, {
            textDocument: { uri: plainUri }
        });
    });

    it('returns no completions for unknown documents', async () => {
        const result = await connection.sendRequest(CompletionRequest.type, {
            textDocument: { uri: 'file:///never-opened.html' },
            position: { line: 0, character: 0 }
        });

        deepEqual(result, []);
    });

    it('expands abbreviation via custom request', async () => {
        const result = await connection.sendRequest('emmet/expandAbbreviation', {
            textDocument: { uri },
            position: { line: 0, character: 7 }
        }) as { abbreviation: string, expanded: string, range: unknown } | null;

        ok(result);
        equal(result.abbreviation, 'ul>li*3');
        equal(result.expanded, '<ul>\n\t<li></li>\n\t<li></li>\n\t<li></li>\n</ul>');
        deepEqual(result.range, {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 7 }
        });
    });

    it('reports tracking stats', async () => {
        const stats = await connection.sendRequest('emmet/getTrackingStats', undefined) as {
            documentsTracked: number,
            activeTrackers: number,
            activeTimers: number
        };

        equal(stats.documentsTracked, 1);
        ok(stats.activeTrackers >= 0);
    });
});
