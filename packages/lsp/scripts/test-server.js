#!/usr/bin/env node

/**
 * Test script for Emmet LSP Server
 * This script simulates LSP client interactions for testing purposes
 */

const { spawn } = require('child_process');
const path = require('path');

class EmmetLSPTester {
    constructor() {
        this.serverProcess = null;
        this.messageId = 1;
        this.responses = new Map();
    }

    async startServer() {
        console.log('Starting Emmet LSP Server...');
        
        const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
        this.serverProcess = spawn('node', [serverPath, '--stdio'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error('Server stderr:', data.toString());
        });

        this.serverProcess.stdout.on('data', (data) => {
            this.handleServerMessage(data.toString());
        });

        this.serverProcess.on('exit', (code) => {
            console.log(`Server exited with code ${code}`);
        });

        // Wait a bit for server to start
        await this.sleep(1000);
    }

    handleServerMessage(data) {
        const lines = data.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            if (line.startsWith('Content-Length:')) {
                continue;
            }
            if (line.trim() === '') {
                continue;
            }
            
            try {
                const message = JSON.parse(line);
                console.log('Server response:', JSON.stringify(message, null, 2));
                
                if (message.id && this.responses.has(message.id)) {
                    this.responses.get(message.id).resolve(message);
                    this.responses.delete(message.id);
                }
            } catch (error) {
                // Ignore parse errors for now
            }
        }
    }

    sendMessage(message) {
        const jsonMessage = JSON.stringify(message);
        const content = `Content-Length: ${Buffer.byteLength(jsonMessage)}\r\n\r\n${jsonMessage}`;
        
        console.log('Sending message:', JSON.stringify(message, null, 2));
        this.serverProcess.stdin.write(content);
        
        if (message.id) {
            return new Promise((resolve, reject) => {
                this.responses.set(message.id, { resolve, reject });
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    if (this.responses.has(message.id)) {
                        this.responses.delete(message.id);
                        reject(new Error('Request timeout'));
                    }
                }, 5000);
            });
        }
    }

    async initialize() {
        const initMessage = {
            jsonrpc: '2.0',
            id: this.messageId++,
            method: 'initialize',
            params: {
                processId: process.pid,
                clientInfo: {
                    name: 'emmet-lsp-tester',
                    version: '1.0.0'
                },
                rootUri: `file://${process.cwd()}`,
                capabilities: {
                    textDocument: {
                        synchronization: {
                            dynamicRegistration: true,
                            willSave: true,
                            willSaveWaitUntil: true,
                            didSave: true
                        },
                        completion: {
                            dynamicRegistration: true,
                            completionItem: {
                                snippetSupport: true,
                                commitCharactersSupport: true,
                                documentationFormat: ['markdown', 'plaintext']
                            }
                        },
                        codeAction: {
                            dynamicRegistration: true,
                            codeActionLiteralSupport: {
                                codeActionKind: {
                                    valueSet: ['quickfix', 'refactor']
                                }
                            }
                        },
                        diagnostic: {
                            dynamicRegistration: true
                        }
                    },
                    workspace: {
                        configuration: true,
                        workspaceFolders: true
                    }
                },
                initializationOptions: {
                    enabled: true,
                    showExpandedPreview: true,
                    showSuggestionsAsSnippets: true,
                    showAbbreviationSuggestions: true,
                    triggerExpansionOnTab: true
                }
            }
        };

        const response = await this.sendMessage(initMessage);
        console.log('Initialization response received');

        // Send initialized notification
        await this.sendMessage({
            jsonrpc: '2.0',
            method: 'initialized',
            params: {}
        });

        return response;
    }

    async openDocument(uri, languageId, content) {
        return this.sendMessage({
            jsonrpc: '2.0',
            method: 'textDocument/didOpen',
            params: {
                textDocument: {
                    uri,
                    languageId,
                    version: 1,
                    text: content
                }
            }
        });
    }

    async changeDocument(uri, content, version = 2) {
        return this.sendMessage({
            jsonrpc: '2.0',
            method: 'textDocument/didChange',
            params: {
                textDocument: {
                    uri,
                    version
                },
                contentChanges: [{
                    text: content
                }]
            }
        });
    }

    async requestCompletion(uri, line, character) {
        return this.sendMessage({
            jsonrpc: '2.0',
            id: this.messageId++,
            method: 'textDocument/completion',
            params: {
                textDocument: { uri },
                position: { line, character }
            }
        });
    }

    async requestCodeActions(uri, range) {
        return this.sendMessage({
            jsonrpc: '2.0',
            id: this.messageId++,
            method: 'textDocument/codeAction',
            params: {
                textDocument: { uri },
                range,
                context: {
                    diagnostics: []
                }
            }
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runTests() {
        try {
            await this.startServer();
            await this.initialize();

            console.log('\n=== Testing HTML Abbreviations ===');
            await this.testHtmlAbbreviations();

            console.log('\n=== Testing CSS Abbreviations ===');
            await this.testCssAbbreviations();

            console.log('\n=== Testing Real-time Tracking ===');
            await this.testRealtimeTracking();

            console.log('\n=== Testing JSX Abbreviations ===');
            await this.testJsxAbbreviations();

            console.log('\n✅ All tests completed successfully!');

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            this.cleanup();
        }
    }

    async testHtmlAbbreviations() {
        const uri = 'file:///test.html';
        const content = 'div.container>ul>li*3';

        await this.openDocument(uri, 'html', content);
        await this.sleep(500); // Wait for tracking to process

        const completion = await this.requestCompletion(uri, 0, content.length);
        console.log('HTML completion result:', completion.result?.length || 0, 'items');

        const codeActions = await this.requestCodeActions(uri, {
            start: { line: 0, character: 0 },
            end: { line: 0, character: content.length }
        });
        console.log('HTML code actions:', codeActions.result?.length || 0, 'actions');
    }

    async testCssAbbreviations() {
        const uri = 'file:///test.css';
        const content = 'm10+p5+w100p';

        await this.openDocument(uri, 'css', content);
        await this.sleep(500);

        const completion = await this.requestCompletion(uri, 0, content.length);
        console.log('CSS completion result:', completion.result?.length || 0, 'items');
    }

    async testRealtimeTracking() {
        const uri = 'file:///test-tracking.html';
        
        // Simulate typing character by character
        const abbreviation = 'nav>ul>li*5>a';
        let currentContent = '';

        for (let i = 0; i < abbreviation.length; i++) {
            currentContent += abbreviation[i];
            
            if (i === 0) {
                await this.openDocument(uri, 'html', currentContent);
            } else {
                await this.changeDocument(uri, currentContent, i + 1);
            }
            
            await this.sleep(100); // Simulate typing delay
            
            if (currentContent.length >= 2) {
                const completion = await this.requestCompletion(uri, 0, currentContent.length);
                if (completion.result && completion.result.length > 0) {
                    console.log(`Tracked "${currentContent}" -> ${completion.result.length} completions`);
                }
            }
        }
    }

    async testJsxAbbreviations() {
        const uri = 'file:///test.jsx';
        const content = 'div.card>img+div.card-body>h4+p+button';

        await this.openDocument(uri, 'jsx', content);
        await this.sleep(500);

        const completion = await this.requestCompletion(uri, 0, content.length);
        console.log('JSX completion result:', completion.result?.length || 0, 'items');
    }

    cleanup() {
        if (this.serverProcess) {
            console.log('\nShutting down server...');
            this.serverProcess.kill();
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new EmmetLSPTester();
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, cleaning up...');
        tester.cleanup();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, cleaning up...');
        tester.cleanup();
        process.exit(0);
    });

    tester.runTests().catch(error => {
        console.error('Fatal error:', error);
        tester.cleanup();
        process.exit(1);
    });
}

module.exports = EmmetLSPTester;