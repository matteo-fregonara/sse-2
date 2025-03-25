import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as Diff from 'diff';

import { encoding_for_model } from 'tiktoken';

let totalEnergyUsed = 0;
let energyBarItem: vscode.StatusBarItem;

// Global buffers for capturing a full suggestion session.
let previousText: string = ''; // The last known full document text.
let suggestionBufferBase: string | null = null; // Document state before the suggestion started.
let suggestionBufferFinal: string | null = null; // Most recent document state during the suggestion.
let suggestionBufferTimer: NodeJS.Timeout | null = null;
// Adjust debounce time (in ms) as needed.
const suggestionDebounceTime = 4000;

export function activate(context: vscode.ExtensionContext) {
  const logFilePath = path.join(context.globalStoragePath, 'vscode_inline_chat_log.txt');
  if (!fs.existsSync(context.globalStoragePath)) {
    fs.mkdirSync(context.globalStoragePath, { recursive: true });
  }

  let loggingEnabled = true;
  console.log(`Inline chat logger extension is now active. Logging to: ${logFilePath}`);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(record) Logging Chat';
  statusBarItem.tooltip = 'Toggle inline chat logging';
  statusBarItem.command = 'inlineChatLogger.toggle';
  statusBarItem.show();
  energyBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  energyBarItem.text = `Energy used: ${totalEnergyUsed}`;
  energyBarItem.tooltip = 'Total energy used by the model';
  energyBarItem.show();
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(energyBarItem);

  const toggleCommand = vscode.commands.registerCommand('inlineChatLogger.toggle', () => {
    loggingEnabled = !loggingEnabled;
    statusBarItem.text = loggingEnabled ? '$(record) Logging Chat' : '$(circle-slash) Chat Log Off';
    vscode.window.showInformationMessage(`Inline chat logging ${loggingEnabled ? 'enabled' : 'disabled'}`);
  });
  context.subscriptions.push(toggleCommand);

  const testCommand = vscode.commands.registerCommand('inlineChatLogger.test', async () => {
    try {
      await fs.promises.appendFile(logFilePath, `Test log entry at ${new Date().toISOString()}\n`);
      vscode.window.showInformationMessage(`Successfully wrote to log file at: ${logFilePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to write to log file: ${error}`);
    }
  });
  context.subscriptions.push(testCommand);

  // Initialize previousText with the active document's content.
  if (vscode.window.activeTextEditor) {
    previousText = vscode.window.activeTextEditor.document.getText();
  }
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      previousText = editor.document.getText();
    }
  });

  // Listen for text document changes.
  const textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
    if (!loggingEnabled) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) return;

    const currentText = event.document.getText();

    // Heuristic: if any change spans multiple lines, or adds non-trivial text.
    const isSuggestionChange = event.contentChanges.some(change =>
      change.text.split('\n').length > 1 ||
      (change.range.start.line !== change.range.end.line) ||
      (change.text.trim().length > 0 && change.text.length > 3)
    );

    if (isSuggestionChange) {
      // Capture the document's pre-suggestion state if not already captured.
      if (suggestionBufferBase === null) {
        suggestionBufferBase = previousText;
      }
      // Update the final state of the suggestion.
      suggestionBufferFinal = currentText;

      // Reset the debounce timer on each change.
      if (suggestionBufferTimer) {
        clearTimeout(suggestionBufferTimer);
      }
      suggestionBufferTimer = setTimeout(() => {
        flushSuggestionBuffer(logFilePath, event.document);
      }, suggestionDebounceTime);
    }

    // Update previousText to reflect the current document state.
    previousText = currentText;
  });
  context.subscriptions.push(textChangeListener);

  // // Listen for the inline suggestion commit command.
  // vscode.commands.onDidExecuteCommand(e => {
  //   if (e.command === 'editor.action.inlineSuggest.commit') {
  //     if (suggestionBufferTimer) {
  //       clearTimeout(suggestionBufferTimer);
  //       suggestionBufferTimer = null;
  //     }
  //     // Flush the suggestion buffer immediately when the suggestion is accepted.
  //     flushSuggestionBuffer(logFilePath, vscode.window.activeTextEditor?.document);
  //   }
  // });

  const chatLoggerCommand = vscode.commands.registerCommand('inlineChatLogger.start', () => {
    if (loggingEnabled) {
      fs.promises.appendFile(logFilePath,
        `\n--- Inline chat started (${new Date().toISOString()}) ---\n` +
        '-'.repeat(40) + '\n'
      ).catch(error => console.error('Error logging chat start:', error));
    }
    return undefined;
  });
  context.subscriptions.push(chatLoggerCommand);
}

function flushSuggestionBuffer(logFilePath: string, document?: vscode.TextDocument) {
  if (!document) {
    return;
  }
  if (suggestionBufferBase !== null && suggestionBufferFinal !== null) {
    // Compute a character-level diff between pre-suggestion and final state.
    const diff = Diff.diffChars(suggestionBufferBase, suggestionBufferFinal);
    const insertedText = diff.filter(part => part.added).map(part => part.value).join('');

    const tokenCount = countTokens(insertedText);
    const energyUsed = estimateEnergyUsage(tokenCount);
    totalEnergyUsed += energyUsed;
    energyBarItem.text = `Energy used: ${totalEnergyUsed}`;
    console.log(`Energy used for this suggestion: ${energyUsed} J`);

    if (insertedText.trim().length > 0) {
      const timestamp = new Date().toISOString();
      const fileName = path.basename(document.fileName);
      fs.appendFileSync(logFilePath,
        `\n--- Suggestion accepted (${timestamp}) ---\n` +
        `File: ${fileName}\n` +
        `Suggestion:\n${insertedText}\n` +
        '-'.repeat(40) + '\n'
      );
    }
  }
  // Reset buffers for the next suggestion.
  suggestionBufferBase = null;
  suggestionBufferFinal = null;
}

export function deactivate() {
  console.log('Inline chat logger deactivated!');
}

function countTokens(text: string): number {
  const enc = encoding_for_model("gpt-3.5-turbo");
  return enc.encode(text).length;
}

function estimateEnergyUsage(tokenCount: number): number {
  const JOULES_PER_TOKEN = 3;
  return tokenCount * JOULES_PER_TOKEN;
}