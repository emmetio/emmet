#!/usr/bin/env node

import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    TextDocumentSyncKind,
    InitializeResult,
    DocumentDiagnosticReportKind,
    type DocumentDiagnosticReport,
    Position,
    TextEdit,
    CodeAction,
    CodeActionKind,
    Command,
    CompletionParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { extract } from '../../..';
import { AbbreviationTracker, EmmetSettings, LANGUAGE_CONFIG_MAP } from './types';
import { AbbreviationTrackerService } from './abbreviation-tracker';
import { EmmetCompletionProvider } from './completion-provider';
import { getEmmetSyntax, getLineText, isEmmetLanguage } from './language';
import { EmmetConfigCache, expand } from './config';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const abbreviationTracker = new AbbreviationTrackerService();
const configCache = new EmmetConfigCache();
const completionProvider = new EmmetCompletionProvider(configCache);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

const globalSettings: EmmetSettings = {
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
    optimizeStylesheetParsing: true
};

const documentSettings: Map<string, Thenable<EmmetSettings>> = new Map();

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const allTriggerCharacters = new Set<string>();
    Object.values(LANGUAGE_CONFIG_MAP).forEach(config => {
        config.triggerCharacters.forEach(char => allTriggerCharacters.add(char));
    });

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: TextDocumentSyncKind.Incremental,
                willSaveWaitUntil: false,
                save: { includeText: false }
            },
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: Array.from(allTriggerCharacters)
            },
            codeActionProvider: {
                codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.Refactor]
            },
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false
            }
        }
    };

    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: { supported: true }
        };
    }

    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {});
    }
});

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        documentSettings.clear();
    } else {
        Object.assign(globalSettings, change.settings.emmet || {});
    }
    configCache.clear();
    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<EmmetSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'emmet'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    abbreviationTracker.closeDocument(e.document.uri);
});

documents.onDidOpen(e => {
    abbreviationTracker.initializeDocument(e.document.uri);
    // validateTextDocument is intentionally omitted here: TextDocuments also fires
    // onDidChangeContent on open, so validation happens there to avoid double-running.
});

documents.onDidChangeContent(change => {
    abbreviationTracker.trackAbbreviations(change.document);
    validateTextDocument(change.document);
});

/**
 * Expand a tracked abbreviation, or nothing if it doesn’t expand into anything
 * meaningful
 */
function expandTracked(
    tracker: AbbreviationTracker,
    languageId: string,
    settings: EmmetSettings
): string | undefined {
    try {
        const expanded = expand(tracker.abbreviation, configCache.resolve(languageId, settings));
        return expanded && expanded !== tracker.abbreviation ? expanded : undefined;
    } catch {
        return undefined;
    }
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const settings = await getDocumentSettings(textDocument.uri);

    if (!settings.enabled || !isEmmetLanguage(textDocument.languageId)) {
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
        return;
    }

    const diagnostics: Diagnostic[] = [];
    const tracker = abbreviationTracker.getCurrentTracker(textDocument.uri);
    const expanded = tracker && settings.showExpandedPreview
        ? expandTracked(tracker, textDocument.languageId, settings)
        : undefined;

    if (tracker && expanded) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Information,
            range: {
                start: {
                    line: tracker.range.start.line,
                    character: tracker.range.start.character
                },
                end: {
                    line: tracker.range.end.line,
                    character: tracker.range.end.character
                }
            },
            message: `Emmet: ${tracker.abbreviation} → Press Tab or Ctrl+Space to expand`,
            source: 'emmet',
            tags: []
        };

        if (hasDiagnosticRelatedInformationCapability) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: diagnostic.range
                    },
                    message: `Expands to:\n${expanded}`
                }
            ];
        }

        diagnostics.push(diagnostic);
    }

    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {});

connection.onCompletion(
    async (params: CompletionParams): Promise<CompletionItem[]> => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }

        const settings = await getDocumentSettings(params.textDocument.uri);

        // A completion request is the only place the client tells us where the
        // cursor is, so keep tracking in sync with it
        abbreviationTracker.updateCursorPosition(params.textDocument.uri, params.position);
        abbreviationTracker.trackAbbreviations(document, params.position);

        const triggerCharacter = (params.context && params.context.triggerKind === 2)
            ? params.context.triggerCharacter
            : undefined;

        return completionProvider.provideEnhancedCompletions(
            document,
            params.position,
            settings,
            triggerCharacter
        );
    }
);

connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data?.expanded) {
            item.documentation = {
                kind: 'markdown',
                value: `**Emmet expansion:**\n\n\`\`\`${item.data.language || 'html'}\n${item.data.expanded}\n\`\`\``
            };
            item.command = Command.create(
                'Expand Emmet Abbreviation',
                'emmet.expandAbbreviation',
                item.data
            );
        }
        return item;
    }
);

connection.onCodeAction(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const tracker = abbreviationTracker.getCurrentTracker(params.textDocument.uri);
    if (!tracker) {
        return [];
    }

    const settings = await getDocumentSettings(params.textDocument.uri);
    const expanded = expandTracked(tracker, document.languageId, settings);
    if (!expanded) {
        return [];
    }

    const expandAction: CodeAction = {
        title: `Expand Emmet abbreviation: ${tracker.abbreviation}`,
        kind: CodeActionKind.QuickFix,
        diagnostics: params.context.diagnostics,
        edit: {
            changes: {
                [params.textDocument.uri]: [
                    TextEdit.replace({
                        start: {
                            line: tracker.range.start.line,
                            character: tracker.range.start.character
                        },
                        end: {
                            line: tracker.range.end.line,
                            character: tracker.range.end.character
                        }
                    }, expanded)
                ]
            }
        },
        command: Command.create(
            'Expand Abbreviation',
            'emmet.expandAbbreviation',
            params.textDocument.uri,
            tracker.range,
            expanded
        )
    };

    const wrapAction: CodeAction = {
        title: 'Wrap with Emmet abbreviation...',
        kind: CodeActionKind.Refactor,
        command: Command.create(
            'Wrap with Abbreviation',
            'emmet.wrapWithAbbreviation',
            params.textDocument.uri,
            params.range
        )
    };

    return [expandAction, wrapAction];
});

// Pull-diagnostics endpoint: diagnostics are pushed via connection.sendDiagnostics
// in validateTextDocument, so this always returns empty for pull-model clients.
connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: []
        } satisfies DocumentDiagnosticReport;
    }

    return {
        kind: DocumentDiagnosticReportKind.Full,
        items: []
    } satisfies DocumentDiagnosticReport;
});

connection.onRequest('emmet/expandAbbreviation', async (params: { textDocument: { uri: string }, position: { line: number, character: number } }) => {
    const { textDocument, position } = params;
    const document = documents.get(textDocument.uri);
    if (!document) {
        return null;
    }

    const settings = await getDocumentSettings(textDocument.uri);
    const line = getLineText(document, position.line);

    const extracted = extract(line, position.character, {
        type: getEmmetSyntax(document.languageId),
        lookAhead: true,
        prefix: ''
    });

    if (!extracted) {
        return null;
    }

    try {
        const config = configCache.resolve(document.languageId, settings);
        const expanded = expand(extracted.abbreviation, config);

        return {
            abbreviation: extracted.abbreviation,
            expanded,
            range: {
                start: Position.create(position.line, extracted.start),
                end: Position.create(position.line, extracted.end)
            }
        };
    } catch {
        return null;
    }
});

connection.onRequest('emmet/getTrackingStats', () => {
    return abbreviationTracker.getStats();
});

documents.listen(connection);
connection.listen();
