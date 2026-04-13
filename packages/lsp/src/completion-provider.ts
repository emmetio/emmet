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

const LANGUAGE_NAMES: Record<string, string> = {
    html: 'HTML', xml: 'XML', jsx: 'JSX', tsx: 'TSX', vue: 'Vue', svelte: 'Svelte',
    css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less', stylus: 'Stylus',
    javascript: 'JavaScript', typescript: 'TypeScript'
};

const COMMON_CLASSES = ['container', 'wrapper', 'content', 'header', 'footer', 'main', 'sidebar'];
const COMMON_IDS = ['app', 'main', 'content', 'header', 'footer', 'nav', 'sidebar'];
const CSS_ABBREVIATIONS = [
    { abbr: 'm', prop: 'margin' }, { abbr: 'p', prop: 'padding' },
    { abbr: 'w', prop: 'width' }, { abbr: 'h', prop: 'height' },
    { abbr: 'bg', prop: 'background' }, { abbr: 'c', prop: 'color' },
    { abbr: 'd', prop: 'display' }, { abbr: 'pos', prop: 'position' },
    { abbr: 'f', prop: 'font' }, { abbr: 'ta', prop: 'text-align' }
];
const COMMON_ELEMENTS = ['div', 'span', 'p', 'a', 'img', 'ul', 'li', 'h1', 'h2', 'h3'];

export class EmmetCompletionProvider {
    private readonly maxCompletions = 10;
    private readonly minAbbreviationLength = 2;

    provideCompletions(
        document: TextDocument,
        position: Position,
        settings: EmmetSettings
    ): CompletionItem[] {
        if (!settings.enabled || !this.isEmmetLanguage(document.languageId)) {
            return [];
        }

        if (!settings.showAbbreviationSuggestions) {
            return [];
        }

        const line = this.getLineText(document, position.line);
        const syntax = this.getEmmetSyntax(document.languageId);

        const extracted = extract(line, position.character, {
            type: syntax,
            lookAhead: true,
            prefix: ''
        });

        if (!extracted || extracted.abbreviation.length < this.minAbbreviationLength) {
            return [];
        }

        try {
            const config = this.getEmmetConfig(document.languageId, settings);
            const expanded = expandAbbreviation(extracted.abbreviation, config);

            if (!expanded || expanded === extracted.abbreviation) {
                return [];
            }

            abbreviationTracker.trackAbbreviations(document, position);

            return [this.createCompletionItem(
                extracted.abbreviation,
                expanded,
                document,
                position,
                extracted.start,
                extracted.end,
                settings
            )];
        } catch {
            return [];
        }
    }

    provideEnhancedCompletions(
        document: TextDocument,
        position: Position,
        settings: EmmetSettings,
        triggerCharacter?: string
    ): CompletionItem[] {
        const basicCompletions = this.provideCompletions(document, position, settings);
        const contextCompletions = triggerCharacter
            ? this.getContextCompletions(document, triggerCharacter)
            : [];
        return this.sortAndLimitCompletions([...basicCompletions, ...contextCompletions]);
    }

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

        return {
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
    }

    private getContextCompletions(
        document: TextDocument,
        triggerCharacter: string
    ): CompletionItem[] {
        const syntax = this.getEmmetSyntax(document.languageId);

        switch (triggerCharacter) {
            case '.':
                if (syntax === 'markup') return this.getClassCompletions();
                break;
            case '#':
                if (syntax === 'markup') return this.getIdCompletions();
                break;
            case ':':
                if (syntax === 'stylesheet') return this.getCssPropertyCompletions();
                break;
            case '*':
                return this.getMultiplierCompletions();
            case '>':
            case '+':
            case '^':
                return this.getSiblingCompletions(triggerCharacter);
        }

        return [];
    }

    private getClassCompletions(): CompletionItem[] {
        return COMMON_CLASSES.map((className, index) => ({
            label: `.${className}`,
            kind: CompletionItemKind.Class,
            detail: `Class: ${className}`,
            insertText: className,
            sortText: this.getSortText(className, index + 100)
        }));
    }

    private getIdCompletions(): CompletionItem[] {
        return COMMON_IDS.map((idName, index) => ({
            label: `#${idName}`,
            kind: CompletionItemKind.Value,
            detail: `ID: ${idName}`,
            insertText: idName,
            sortText: this.getSortText(idName, index + 200)
        }));
    }

    private getCssPropertyCompletions(): CompletionItem[] {
        return CSS_ABBREVIATIONS.map((item, index) => ({
            label: `${item.abbr}:`,
            kind: CompletionItemKind.Property,
            detail: `CSS: ${item.prop}`,
            insertText: `${item.prop}: `,
            sortText: this.getSortText(item.abbr, index + 300)
        }));
    }

    private getMultiplierCompletions(): CompletionItem[] {
        const completions: CompletionItem[] = [];
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

    private getSiblingCompletions(operator: string): CompletionItem[] {
        return COMMON_ELEMENTS.map((element, index) => ({
            label: `${operator}${element}`,
            kind: CompletionItemKind.Keyword,
            detail: `${this.getOperatorDescription(operator)} ${element}`,
            insertText: element,
            sortText: this.getSortText(`${operator}${element}`, index + 500)
        }));
    }

    private getOperatorDescription(operator: string): string {
        switch (operator) {
            case '>': return 'Child:';
            case '+': return 'Sibling:';
            case '^': return 'Climb-up:';
            default: return 'Element:';
        }
    }

    private sortAndLimitCompletions(completions: CompletionItem[]): CompletionItem[] {
        return completions
            .sort((a, b) => (a.sortText || '').localeCompare(b.sortText || ''))
            .slice(0, this.maxCompletions);
    }

    private getSortText(label: string, priority: number): string {
        return `${priority.toString().padStart(4, '0')}_${label}`;
    }

    private createDocumentationMarkdown(abbreviation: string, expanded: string, languageId: string): string {
        const langName = LANGUAGE_NAMES[languageId] ?? languageId.toUpperCase();
        return `**Emmet Abbreviation**\n\n` +
               `\`${abbreviation}\` → Expands to:\n\n` +
               `\`\`\`${languageId}\n${expanded}\n\`\`\`\n\n` +
               `*Language: ${langName}*`;
    }

    private getPreviewText(expanded: string, maxLength = 50): string {
        const singleLine = expanded.replace(/\s+/g, ' ').trim();
        return singleLine.length > maxLength
            ? singleLine.substring(0, maxLength) + '...'
            : singleLine;
    }

    private getLineText(document: TextDocument, lineNumber: number): string {
        return document.getText({
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber + 1, character: 0 }
        }).replace(/\n$/, '');
    }

    private isEmmetLanguage(languageId: string): languageId is SupportedLanguage {
        return languageId in LANGUAGE_CONFIG_MAP;
    }

    private getEmmetSyntax(languageId: string): EmmetSyntax {
        const config = LANGUAGE_CONFIG_MAP[languageId as SupportedLanguage];
        return config ? config.syntax : 'markup';
    }

    private getEmmetConfig(languageId: string, settings: EmmetSettings): UserConfig {
        return {
            type: this.getEmmetSyntax(languageId),
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
            variables: settings.variables || {},
            snippets: {}
        };
    }
}

export const completionProvider = new EmmetCompletionProvider();
