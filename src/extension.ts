import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { encoding_for_model } from 'tiktoken';

let totalEnergyUsed = 0;
let recentEnergyUsed = 0;
let totalCO2Emissions = 0;
let energyBarItem: vscode.StatusBarItem;

let previousText: string = '';
let suggestionBufferBase: string | null = null;
let suggestionBufferFinal: string | null = null;
let suggestionBufferTimer: NodeJS.Timeout | null = null;

const suggestionDebounceTime = 2000;
const MIN_TOKEN_THRESHOLD = 3;
const JOULES_PER_TOKEN = 2.16;

export function activate(context: vscode.ExtensionContext) {
  const logFilePath = path.join(context.globalStoragePath, 'energy_consumption_log.txt');
  if (!fs.existsSync(context.globalStoragePath)) {
    fs.mkdirSync(context.globalStoragePath, { recursive: true });
  }

  let loggingEnabled = true;
  console.log(`GitHub Copilot Energy Consumption extension is now active. Logging to: ${logFilePath}`);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  statusBarItem.text = '$(record) Tracking GitHub Copilot Energy Consumption';
  statusBarItem.tooltip = 'Toggle GitHub Copilot energy consumption logging';
  statusBarItem.command = 'githubCopilotEnergy.toggle';
  statusBarItem.show();

  energyBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  energyBarItem.text = `Total Energy Consumed: ~${totalEnergyUsed.toFixed(2)} J`;
  energyBarItem.tooltip = `Last Edit: ~${recentEnergyUsed.toFixed(2)} J\nTotal CO₂ emissions: ~${totalCO2Emissions.toFixed(2)} gCO₂`;
  energyBarItem.show();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(energyBarItem);

  const toggleCommand = vscode.commands.registerCommand('githubCopilotEnergy.toggle', () => {
    loggingEnabled = !loggingEnabled;
    statusBarItem.text = loggingEnabled ? '$(record) Logging Energy' : '$(circle-slash) Energy Log Off';
    vscode.window.showInformationMessage(`GitHub Copilot energy consumption logging ${loggingEnabled ? 'enabled' : 'disabled'}`);
  });
  context.subscriptions.push(toggleCommand);

  const testCommand = vscode.commands.registerCommand('githubCopilotEnergy.test', async () => {
    try {
      await fs.promises.appendFile(logFilePath, `Test log entry at ${new Date().toISOString()}\n`);
      vscode.window.showInformationMessage(`Successfully wrote to log file at: ${logFilePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to write to log file: ${error}`);
    }
  });
  context.subscriptions.push(testCommand);

  if (vscode.window.activeTextEditor) {
    previousText = vscode.window.activeTextEditor.document.getText();
  }
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      previousText = editor.document.getText();
    }
  });

  const textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
    if (!loggingEnabled) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) return;

    const currentText = event.document.getText();
    
    const hasSignificantChange = event.contentChanges.some(change => {
      const addedText = change.text;
      return (addedText.split('\n').length > 1 ||
              (change.range.start.line !== change.range.end.line) ||
              addedText.trim().length >= MIN_TOKEN_THRESHOLD);
    });

    if (hasSignificantChange) {
      if (suggestionBufferBase === null) {
        suggestionBufferBase = previousText;
      }
      suggestionBufferFinal = currentText;

      if (suggestionBufferTimer) {
        clearTimeout(suggestionBufferTimer);
      }
      suggestionBufferTimer = setTimeout(() => {
        flushSuggestionBuffer(logFilePath, event.document);
      }, suggestionDebounceTime);
    }

    previousText = currentText;
  });
  context.subscriptions.push(textChangeListener);

  const energyLoggerCommand = vscode.commands.registerCommand('githubCopilotEnergy.start', () => {
    if (loggingEnabled) {
      fs.promises.appendFile(logFilePath,
        `\n--- GitHub Copilot energy tracking started (${new Date().toISOString()}) ---\n` +
        '-'.repeat(40) + '\n'
      ).catch(error => console.error('Error logging energy start:', error));
    }
    return undefined;
  });
  context.subscriptions.push(energyLoggerCommand);
}

function flushSuggestionBuffer(logFilePath: string, document?: vscode.TextDocument) {
  if (!document || suggestionBufferBase === null || suggestionBufferFinal === null) {
    return;
  }

  const insertedText = suggestionBufferFinal.slice(suggestionBufferBase.length);
  const tokenCount = countTokens(insertedText);

  if (tokenCount >= MIN_TOKEN_THRESHOLD) {
    const recentEnergyUsed = Number((tokenCount * JOULES_PER_TOKEN).toFixed(2));
    totalEnergyUsed = Number((totalEnergyUsed + recentEnergyUsed).toFixed(2));
    totalCO2Emissions = Number((totalEnergyUsed / 3600000 * 77).toFixed(2));
    
    energyBarItem.text = `Total Energy Consumed: ~${totalEnergyUsed.toFixed(2)} J`;
    energyBarItem.tooltip = `Last Edit: ~${recentEnergyUsed.toFixed(2)} J\nTotal CO₂ emissions: ~${totalCO2Emissions.toFixed(2)} gCO₂`;
    console.log(`Energy used for this suggestion: ~${recentEnergyUsed} J (Token count: ${tokenCount})`);

    if (insertedText.trim().length > 0) {
      const timestamp = new Date().toISOString();
      const fileName = path.basename(document.fileName);
      fs.appendFileSync(logFilePath,
        `\n--- GitHub Copilot Edit (${timestamp}) ---\n` +
        `File: ${fileName}\n` +
        `Suggestion:\n${insertedText}\n` +
        `Token Count: ${tokenCount}\n` +
        `Energy Consumption: ${recentEnergyUsed} J\n` +
        `Total Energy Consumption: ${totalEnergyUsed} J\n` +
        `Total CO₂ emissions: ${totalCO2Emissions} gCO₂\n` +
        '-'.repeat(40) + '\n'
      );
    }
  }
  
  suggestionBufferBase = null;
  suggestionBufferFinal = null;
}

export function deactivate() {
  console.log('GitHub Copilot energy consumption deactivated!');
}

function countTokens(text: string): number {
  const enc = encoding_for_model("gpt-4o");
  return enc.encode(text).length;
}