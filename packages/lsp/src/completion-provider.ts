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

import expandAbbreviation, { extract, resolveConfig } from '../../..';
import { EmmetSettings, EmmetCompletionData } from './types';
import { MIN_ABBREVIATION_LENGTH, getEmmetSyntax, getLineText, isEmmetLanguage } from './language';
import { getEmmetConfig } from './config';

const LANGUAGE_NAMES: Record<string, string> = {
    html: 'HTML', xml: 'XML', jsx: 'JSX', tsx: 'TSX', vue: 'Vue', svelte: 'Svelte',
    css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less', stylus: 'Stylus',
    javascript: 'JavaScript', typescript: 'TypeScript'
};

const COMMON_CLASSES = ['container', 'wrapper', 'content', 'header', 'footer', 'main', 'sidebar'];
const COMMON_IDS = ['app', 'main', 'content', 'header', 'footer', 'nav', 'sidebar'];
const COMMON_ELEMENTS = ['div', 'span', 'p', 'a', 'img', 'ul', 'li', 'h1', 'h2', 'h3'];

/**
 * Property name of a stylesheet snippet, if it defines one: snippets are either
 * `property`, `property:value1|value2` or a raw CSS fragment (a comment, an
 * at-rule) which has no property name
 */
function cssPropertyName(snippet: string): string | undefined {
    const name = snippet.split(':', 1)[0]!;
    return /^[a-z][a-z-]*$/.test(name) ? name : undefined;
}

/**
 * Known CSS property abbreviations, derived from Emmet’s own stylesheet snippets
 */
const CSS_ABBREVIATIONS = Object.entries(resolveConfig({ type: 'stylesheet' }).snippets)
    .reduce<{ abbr: string, prop: string }[]>((result, [abbr, snippet]) => {
        const prop = cssPropertyName(snippet);
        if (prop) {
            result.push({ abbr, prop });
        }
        return result;
    }, [])
    .sort((a, b) => a.abbr.localeCompare(b.abbr));

export class EmmetCompletionProvider {
    private readonly maxCompletions = 10;

    provideCompletions(
        document: TextDocument,
        position: Position,
        settings: EmmetSettings
    ): CompletionItem[] {
        if (!settings.enabled || !isEmmetLanguage(document.languageId)) {
            return [];
        }

        if (!settings.showAbbreviationSuggestions) {
            return [];
        }

        const line = getLineText(document, position.line);
        const syntax = getEmmetSyntax(document.languageId);

        const extracted = extract(line, position.character, {
            type: syntax,
            lookAhead: true,
            prefix: ''
        });

        if (!extracted || extracted.abbreviation.length < MIN_ABBREVIATION_LENGTH) {
            return [];
        }

        try {
            const config = getEmmetConfig(document.languageId, settings);
            const expanded = expandAbbreviation(extracted.abbreviation, config);

            if (!expanded || expanded === extracted.abbreviation) {
                return [];
            }

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
            ? this.getContextCompletions(document, position, triggerCharacter)
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
            syntax: getEmmetSyntax(document.languageId),
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
        position: Position,
        triggerCharacter: string
    ): CompletionItem[] {
        const syntax = getEmmetSyntax(document.languageId);

        switch (triggerCharacter) {
            case '.':
                if (syntax === 'markup') return this.getClassCompletions();
                break;
            case '#':
                if (syntax === 'markup') return this.getIdCompletions();
                break;
            case ':':
                if (syntax === 'stylesheet') {
                    return this.getCssPropertyCompletions(this.getPropertyPrefix(document, position));
                }
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

    /**
     * Abbreviation typed right before the `:` trigger character, used to narrow
     * down the full list of CSS property snippets
     */
    private getPropertyPrefix(document: TextDocument, position: Position): string {
        const line = getLineText(document, position.line).slice(0, position.character);
        return /([a-zA-Z-]+):$/.exec(line)?.[1]?.toLowerCase() ?? '';
    }

    private getCssPropertyCompletions(prefix: string): CompletionItem[] {
        if (!prefix) {
            return [];
        }

        return CSS_ABBREVIATIONS
            .filter(item => item.abbr.startsWith(prefix))
            .map((item, index) => ({
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

}
