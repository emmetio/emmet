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
import expandAbbreviation, { extract, type UserConfig } from '../../..';
import { EmmetSettings, LANGUAGE_CONFIG_MAP, SupportedLanguage } from './types';
import { abbreviationTracker } from './abbreviation-tracker';
import { completionProvider } from './completion-provider';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

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

function isEmmetLanguage(languageId: string): languageId is SupportedLanguage {
    return languageId in LANGUAGE_CONFIG_MAP;
}

function getEmmetSyntax(languageId: string): 'markup' | 'stylesheet' {
    const config = LANGUAGE_CONFIG_MAP[languageId as SupportedLanguage];
    return config ? config.syntax : 'markup';
}

function getEmmetConfig(languageId: string, settings: EmmetSettings): UserConfig {
    return {
        type: getEmmetSyntax(languageId),
        options: {
            'output.tagCase': '',
            'output.attributeCase': '',
            'output.selfClosingStyle': 'html',
            'output.compactBoolean': false,
            'output.booleanAttributes': [],
            'output.reverseAttributes': false,
            'markup.href': true,
            'comment.enabled': false,
            'comment.trigger': ['id', 'class'],
            ...settings.preferences
        },
        variables: settings.variables,
        snippets: {}
    };
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const settings = await getDocumentSettings(textDocument.uri);

    if (!settings.enabled || !isEmmetLanguage(textDocument.languageId)) {
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
        return;
    }

    const diagnostics: Diagnostic[] = [];
    const tracker = abbreviationTracker.getCurrentTracker(textDocument.uri);

    if (tracker && settings.showExpandedPreview) {
        try {
            const config = getEmmetConfig(textDocument.languageId, settings);
            const expanded = expandAbbreviation(tracker.abbreviation, config);

            if (expanded && expanded !== tracker.abbreviation) {
                tracker.expanded = expanded;
                tracker.isValid = true;

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
        } catch {
            tracker.isValid = false;
            tracker.expanded = '';
        }
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
        abbreviationTracker.updateCursorPosition(params.textDocument.uri, params.position);

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

connection.onCodeAction((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const tracker = abbreviationTracker.getCurrentTracker(params.textDocument.uri);
    if (!tracker || !tracker.isValid || !tracker.expanded) {
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
                    }, tracker.expanded)
                ]
            }
        },
        command: Command.create(
            'Expand Abbreviation',
            'emmet.expandAbbreviation',
            params.textDocument.uri,
            tracker.range,
            tracker.expanded
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
    const line = document.getText({
        start: Position.create(position.line, 0),
        end: Position.create(position.line + 1, 0)
    }).replace(/\n$/, '');

    const extracted = extract(line, position.character, {
        type: getEmmetSyntax(document.languageId),
        lookAhead: true,
        prefix: ''
    });

    if (!extracted) {
        return null;
    }

    try {
        const config = getEmmetConfig(document.languageId, settings);
        const expanded = expandAbbreviation(extracted.abbreviation, config);

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
