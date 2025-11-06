import {
    CompletionItem,
    CompletionItemKind,
    TextDocument,
    Position,
    Range,
    TextEdit,
    InsertTextFormat,
    MarkupContent,
    MarkupKind
} from 'vscode-languageserver/node';

import expandAbbreviation, { extract, type UserConfig } from '../../..';
import { EmmetSettings, EmmetCompletionData, LANGUAGE_CONFIG_MAP, SupportedLanguage, EmmetSyntax } from './types';
import { abbreviationTracker } from './abbreviation-tracker';

export class EmmetCompletionProvider {
    private readonly maxCompletions = 10;
    private readonly minAbbreviationLength = 2;

    constructor() {}

    /**
     * Provide completion items for the given position
     */
    async provideCompletions(
        document: TextDocument,
        position: Position,
        settings: EmmetSettings
    ): Promise<CompletionItem[]> {
        if (!settings.enabled || !this.isEmmetLanguage(document.languageId)) {
            return [];
        }

        // Check if we should show abbreviation suggestions
        if (!settings.showAbbreviationSuggestions) {
            return [];
        }

        const line = this.getLineText(document, position.line);
        const syntax = this.getEmmetSyntax(document.languageId);

        // Extract abbreviation at current position
        const extracted = extract(line, position.character, {
            type: syntax,
            lookAhead: true,
            prefix: ''
        });

        if (!extracted || extracted.abbreviation.length < this.minAbbreviationLength) {
            return [];
        }

        // Update abbreviation tracker
        abbreviationTracker.trackAbbreviations(document, position);

        try {
            const config = this.getEmmetConfig(document.languageId, settings);
            const expanded = expandAbbreviation(extracted.abbreviation, config);

            if (!expanded || expanded === extracted.abbreviation) {
                return [];
            }

            const completionItem = this.createCompletionItem(
                extracted.abbreviation,
                expanded,
                document,
                position,
                extracted.start,
                extracted.end,
                settings
            );

            return [completionItem];
        } catch (error) {
            // Invalid abbreviation - return empty array
            return [];
        }
    }

    /**
     * Provide enhanced completions with context awareness
     */
    async provideEnhancedCompletions(
        document: TextDocument,
        position: Position,
        settings: EmmetSettings,
        triggerCharacter?: string
    ): Promise<CompletionItem[]> {
        const completions: CompletionItem[] = [];

        // Get basic completions
        const basicCompletions = await this.provideCompletions(document, position, settings);
        completions.push(...basicCompletions);

        // Add context-aware completions based on trigger character
        if (triggerCharacter) {
            const contextCompletions = this.getContextCompletions(
                document,
                position,
                triggerCharacter,
                settings
            );
            completions.push(...contextCompletions);
        }

        // Sort by priority and limit results
        return this.sortAndLimitCompletions(completions);
    }

    /**
     * Create a completion item for an Emmet abbreviation
     */
    private createCompletionItem(
        abbreviation: string,
        expanded: string,
        document: TextDocument,
        position: Position,
        start: number,
        end: number,
        settings: EmmetSettings
    ): CompletionItem {
        const range = Range.create(
            Position.create(position.line, start),
            Position.create(position.line, end)
        );

        const kind = settings.showSuggestionsAsSnippets
            ? CompletionItemKind.Snippet
            : CompletionItemKind.Text;

        const data: EmmetCompletionData = {
            abbreviation,
            expanded,
            range,
            syntax: this.getEmmetSyntax(document.languageId),
            language: document.languageId
        };

        const documentation: MarkupContent = {
            kind: MarkupKind.Markdown,
            value: this.createDocumentationMarkdown(abbreviation, expanded, document.languageId)
        };

        const item: CompletionItem = {
            label: abbreviation,
            kind,
            detail: `Emmet: ${abbreviation} → ${this.getPreviewText(expanded)}`,
            documentation,
            insertText: expanded,
            insertTextFormat: kind === CompletionItemKind.Snippet
                ? InsertTextFormat.Snippet
                : InsertTextFormat.PlainText,
            textEdit: TextEdit.replace(range, expanded),
            filterText: abbreviation,
            sortText: this.getSortText(abbreviation, 0),
            data,
            commitCharacters: ['\t', '\n'],
            preselect: true
        };

        // Add additional text edits for context-aware insertions
        if (this.needsContextualEdits(document, position)) {
            item.additionalTextEdits = this.getContextualTextEdits(document, position, expanded);
        }

        return item;
    }

    /**
     * Get context-aware completions based on trigger character
     */
    private getContextCompletions(
        document: TextDocument,
        position: Position,
        triggerCharacter: string,
        settings: EmmetSettings
    ): CompletionItem[] {
        const completions: CompletionItem[] = [];
        const syntax = this.getEmmetSyntax(document.languageId);
        const line = this.getLineText(document, position.line);
        const beforeCursor = line.substring(0, position.character);

        switch (triggerCharacter) {
            case '.':
                if (syntax === 'markup') {
                    completions.push(...this.getClassCompletions(beforeCursor, position, settings));
                }
                break;
            case '#':
                if (syntax === 'markup') {
                    completions.push(...this.getIdCompletions(beforeCursor, position, settings));
                }
                break;
            case ':':
                if (syntax === 'stylesheet') {
                    completions.push(...this.getCssPropertyCompletions(beforeCursor, position, settings));
                }
                break;
            case '*':
                completions.push(...this.getMultiplierCompletions(beforeCursor, position, settings));
                break;
            case '>':
            case '+':
            case '^':
                completions.push(...this.getSiblingCompletions(beforeCursor, position, settings, triggerCharacter));
                break;
        }

        return completions;
    }

    /**
     * Get class-related completions
     */
    private getClassCompletions(beforeCursor: string, position: Position, settings: EmmetSettings): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Common class patterns
        const commonClasses = ['container', 'wrapper', 'content', 'header', 'footer', 'main', 'sidebar'];

        commonClasses.forEach((className, index) => {
            completions.push({
                label: `.${className}`,
                kind: CompletionItemKind.Class,
                detail: `Class: ${className}`,
                insertText: className,
                sortText: this.getSortText(className, index + 100)
            });
        });

        return completions;
    }

    /**
     * Get ID-related completions
     */
    private getIdCompletions(beforeCursor: string, position: Position, settings: EmmetSettings): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Common ID patterns
        const commonIds = ['app', 'main', 'content', 'header', 'footer', 'nav', 'sidebar'];

        commonIds.forEach((idName, index) => {
            completions.push({
                label: `#${idName}`,
                kind: CompletionItemKind.Value,
                detail: `ID: ${idName}`,
                insertText: idName,
                sortText: this.getSortText(idName, index + 200)
            });
        });

        return completions;
    }

    /**
     * Get CSS property completions
     */
    private getCssPropertyCompletions(beforeCursor: string, position: Position, settings: EmmetSettings): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Common CSS property abbreviations
        const cssAbbreviations = [
            { abbr: 'm', prop: 'margin' },
            { abbr: 'p', prop: 'padding' },
            { abbr: 'w', prop: 'width' },
            { abbr: 'h', prop: 'height' },
            { abbr: 'bg', prop: 'background' },
            { abbr: 'c', prop: 'color' },
            { abbr: 'd', prop: 'display' },
            { abbr: 'pos', prop: 'position' },
            { abbr: 'f', prop: 'font' },
            { abbr: 'ta', prop: 'text-align' }
        ];

        cssAbbreviations.forEach((item, index) => {
            completions.push({
                label: `${item.abbr}:`,
                kind: CompletionItemKind.Property,
                detail: `CSS: ${item.prop}`,
                insertText: `${item.prop}: `,
                sortText: this.getSortText(item.abbr, index + 300)
            });
        });

        return completions;
    }

    /**
     * Get multiplier completions (for *)
     */
    private getMultiplierCompletions(beforeCursor: string, position: Position, settings: EmmetSettings): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Common multiplier values
        for (let i = 2; i <= 10; i++) {
            completions.push({
                label: `*${i}`,
                kind: CompletionItemKind.Operator,
                detail: `Multiply by ${i}`,
                insertText: i.toString(),
                sortText: this.getSortText(`*${i}`, i + 400)
            });
        }

        return completions;
    }

    /**
     * Get sibling completions (for >, +, ^)
     */
    private getSiblingCompletions(beforeCursor: string, position: Position, settings: EmmetSettings, operator: string): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Common HTML elements for siblings
        const commonElements = ['div', 'span', 'p', 'a', 'img', 'ul', 'li', 'h1', 'h2', 'h3'];

        commonElements.forEach((element, index) => {
            completions.push({
                label: `${operator}${element}`,
                kind: CompletionItemKind.Keyword,
                detail: `${this.getOperatorDescription(operator)} ${element}`,
                insertText: element,
                sortText: this.getSortText(`${operator}${element}`, index + 500)
            });
        });

        return completions;
    }

    /**
     * Get operator description for UI
     */
    private getOperatorDescription(operator: string): string {
        switch (operator) {
            case '>': return 'Child:';
            case '+': return 'Sibling:';
            case '^': return 'Climb-up:';
            default: return 'Element:';
        }
    }

    /**
     * Sort and limit completions
     */
    private sortAndLimitCompletions(completions: CompletionItem[]): CompletionItem[] {
        return completions
            .sort((a, b) => (a.sortText || '').localeCompare(b.sortText || ''))
            .slice(0, this.maxCompletions);
    }

    /**
     * Generate sort text for consistent ordering
     */
    private getSortText(label: string, priority: number): string {
        return `${priority.toString().padStart(4, '0')}_${label}`;
    }

    /**
     * Create documentation markdown
     */
    private createDocumentationMarkdown(abbreviation: string, expanded: string, languageId: string): string {
        const syntax = this.getLanguageName(languageId);

        return `**Emmet Abbreviation**\n\n` +
               `\`${abbreviation}\` → Expands to:\n\n` +
               `\`\`\`${languageId}\n${expanded}\n\`\`\`\n\n` +
               `*Language: ${syntax}*`;
    }

    /**
     * Get preview text (truncated if too long)
     */
    private getPreviewText(expanded: string, maxLength: number = 50): string {
        const singleLine = expanded.replace(/\s+/g, ' ').trim();
        return singleLine.length > maxLength
            ? singleLine.substring(0, maxLength) + '...'
            : singleLine;
    }

    /**
     * Check if contextual edits are needed
     */
    private needsContextualEdits(document: TextDocument, position: Position): boolean {
        // Add logic for when additional text edits might be needed
        // For example, auto-closing tags, indentation adjustments, etc.
        return false;
    }

    /**
     * Get contextual text edits
     */
    private getContextualTextEdits(document: TextDocument, position: Position, expanded: string): TextEdit[] {
        // Return additional text edits if needed
        return [];
    }

    /**
     * Get line text
     */
    private getLineText(document: TextDocument, lineNumber: number): string {
        return document.getText({
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber + 1, character: 0 }
        }).replace(/\n$/, '');
    }

    /**
     * Check if language is supported by Emmet
     */
    private isEmmetLanguage(languageId: string): languageId is SupportedLanguage {
        return languageId in LANGUAGE_CONFIG_MAP;
    }

    /**
     * Get Emmet syntax for language
     */
    private getEmmetSyntax(languageId: string): EmmetSyntax {
        const config = LANGUAGE_CONFIG_MAP[languageId as SupportedLanguage];
        return config ? config.syntax : 'markup';
    }

    /**
     * Get human-readable language name
     */
    private getLanguageName(languageId: string): string {
        const names: Record<string, string> = {
            html: 'HTML',
            xml: 'XML',
            jsx: 'JSX',
            tsx: 'TSX',
            vue: 'Vue',
            svelte: 'Svelte',
            css: 'CSS',
            scss: 'SCSS',
            sass: 'Sass',
            less: 'Less',
            stylus: 'Stylus',
            javascript: 'JavaScript',
            typescript: 'TypeScript'
        };
        return names[languageId] || languageId.toUpperCase();
    }

    /**
     * Get Emmet configuration for expansion
     */
    private getEmmetConfig(languageId: string, settings: EmmetSettings): UserConfig {
        const syntax = this.getEmmetSyntax(languageId);

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
                ...settings.preferences
            },
            variables: settings.variables || {},
            snippets: {}
        };
    }
}

export const completionProvider = new EmmetCompletionProvider();
