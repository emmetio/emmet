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
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    DocumentDiagnosticReportKind,
    type DocumentDiagnosticReport,
    Range,
    Position,
    TextEdit,
    CodeAction,
    CodeActionKind,
    Command,
    WorkspaceEdit,
    DidChangeTextDocumentParams,
    CompletionParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import expandAbbreviation, { extract, type ExtractedAbbreviation, type UserConfig } from '../../..';
import { EmmetSettings, LANGUAGE_CONFIG_MAP, SupportedLanguage } from './types';
import { abbreviationTracker } from './abbreviation-tracker';
import { completionProvider } from './completion-provider';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// Global settings, used when the `workspace/configuration` request is not supported
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

let documentSettings: Map<string, Thenable<EmmetSettings>> = new Map();

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
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
            workspaceFolders: {
                supported: true
            }
        };
    }

    connection.console.log('Emmet LSP Server initialized');
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }

    connection.console.log('Emmet LSP Server ready for tracking abbreviations');
});

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        Object.assign(globalSettings, change.settings.emmet || {});
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
    connection.console.log('Configuration updated');
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

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    abbreviationTracker.closeDocument(e.document.uri);
    connection.console.log(`Closed document: ${e.document.uri}`);
});

// Initialize document tracking when opened
documents.onDidOpen(e => {
    abbreviationTracker.initializeDocument(e.document.uri);
    validateTextDocument(e.document);
    connection.console.log(`Opened document: ${e.document.uri} (${e.document.languageId})`);
});

// Track changes on every keystroke
documents.onDidChangeContent((change: DidChangeTextDocumentParams) => {
    const document = change.document;

    // Update abbreviation tracking immediately for real-time feedback
    abbreviationTracker.trackAbbreviations(document, undefined, (tracker) => {
        if (tracker) {
            connection.console.log(`Tracked abbreviation: "${tracker.abbreviation}" at line ${tracker.position.line}`);
        }
    });

    // Validate document with debounced logic
    validateTextDocument(document);
});

// Helper function to determine if a language supports Emmet
function isEmmetLanguage(languageId: string): languageId is SupportedLanguage {
    return languageId in LANGUAGE_CONFIG_MAP;
}

// Helper function to get Emmet syntax for language
function getEmmetSyntax(languageId: string): 'markup' | 'stylesheet' {
    const config = LANGUAGE_CONFIG_MAP[languageId as SupportedLanguage];
    return config ? config.syntax : 'markup';
}

// Helper function to get Emmet configuration for expansion
function getEmmetConfig(languageId: string, settings: EmmetSettings): UserConfig {
    const syntax = getEmmetSyntax(languageId);

    return {
        type: syntax,
        options: {
            'output.tagCase': settings.preferences?.['output.tagCase'] || '',
            'output.attributeCase': settings.preferences?.['output.attributeCase'] || '',
            'output.selfClosingStyle': settings.preferences?.['output.selfClosingStyle'] || 'html',
            'output.compactBoolean': settings.preferences?.['output.compactBoolean'] || false,
            'output.booleanAttributes': settings.preferences?.['output.booleanAttributes'] || [],
            'output.reverseAttributes': settings.preferences?.['output.reverseAttributes'] || false,
            'markup.href': settings.preferences?.['markup.href'] || true,
            'comment.enabled': settings.preferences?.['comment.enabled'] || false,
            'comment.trigger': settings.preferences?.['comment.trigger'] || ['id', 'class'],
            'css.unitAliases': settings.preferences?.['css.unitAliases'] || {},
            'css.intUnit': settings.preferences?.['css.intUnit'] || 'px',
            'css.floatUnit': settings.preferences?.['css.floatUnit'] || 'em',
            ...settings.preferences
        },
        variables: settings.variables,
        snippets: {}
    };
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    const settings = await getDocumentSettings(textDocument.uri);

    if (!settings.enabled || !isEmmetLanguage(textDocument.languageId)) {
        // Clear diagnostics for unsupported languages
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
        return;
    }

    const diagnostics: Diagnostic[] = [];

    // Get current abbreviation tracker
    const tracker = abbreviationTracker.getCurrentTracker(textDocument.uri);

    if (tracker && settings.showExpandedPreview) {
        try {
            const config = getEmmetConfig(textDocument.languageId, settings);
            const expanded = expandAbbreviation(tracker.abbreviation, config);

            if (expanded && expanded !== tracker.abbreviation) {
                // Update tracker with expanded content
                tracker.expanded = expanded;
                tracker.isValid = true;

                // Create diagnostic with preview
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
        } catch (error) {
            // Mark as invalid abbreviation
            tracker.isValid = false;
            tracker.expanded = '';
        }
    }

    // Send the computed diagnostics to the client.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
    connection.console.log('We received a file change event');
});

// Enhanced completion handler with real-time abbreviation tracking
connection.onCompletion(
    async (params: CompletionParams): Promise<CompletionItem[]> => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }

        const settings = await getDocumentSettings(params.textDocument.uri);

        // Update cursor position for tracking
        abbreviationTracker.updateCursorPosition(params.textDocument.uri, params.position);

        // Get completions from the provider
        const triggerCharacter = (params.context && params.context.triggerKind === 2)
            ? params.context.triggerCharacter
            : undefined;

        return await completionProvider.provideEnhancedCompletions(
            document,
            params.position,
            settings,
            triggerCharacter
        );
    }
);

// Resolve completion items with additional details
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data?.expanded) {
            item.documentation = {
                kind: 'markdown',
                value: `**Emmet expansion:**\n\n\`\`\`${item.data.language || 'html'}\n${item.data.expanded}\n\`\`\``
            };

            // Add command to trigger expansion
            item.command = Command.create(
                'Expand Emmet Abbreviation',
                'emmet.expandAbbreviation',
                item.data
            );
        }
        return item;
    }
);

// Code actions for expanding abbreviations
connection.onCodeAction((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const tracker = abbreviationTracker.getCurrentTracker(params.textDocument.uri);
    if (!tracker || !tracker.isValid || !tracker.expanded) {
        return [];
    }

    const actions: CodeAction[] = [];

    // Quick fix to expand abbreviation
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

    actions.push(expandAction);

    // Refactor action to wrap with abbreviation
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

    actions.push(wrapAction);

    return actions;
});

// Diagnostic provider for real-time feedback
connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: []
        } satisfies DocumentDiagnosticReport;
    }

    await validateTextDocument(document);

    return {
        kind: DocumentDiagnosticReportKind.Full,
        items: [] // Diagnostics are sent via connection.sendDiagnostics
    } satisfies DocumentDiagnosticReport;
});

// Custom commands for Emmet operations
connection.onRequest('emmet/expandAbbreviation', async (params: any) => {
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
    } catch (error) {
        return null;
    }
});

// Request for abbreviation tracking statistics (useful for debugging)
connection.onRequest('emmet/getTrackingStats', () => {
    return abbreviationTracker.getStats();
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

// Log server start
connection.console.log('Emmet LSP Server started with real-time abbreviation tracking');
