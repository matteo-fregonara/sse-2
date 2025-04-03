# GitHub Copilot Energy Consumption Tracker

A Visual Studio Code extension that tracks and logs the estimated energy consumption and CO₂ emissions of GitHub Copilot suggestions.

## Features

- Monitors text changes in VS Code to detect GitHub Copilot suggestions
- Estimates energy consumption based on token count (2.16 Joules per token)
- Calculates approximate CO₂ emissions (0.0000214 gCO₂ per Joule)
- Displays real-time stats in the status bar:
  - Total energy consumed
  - Energy used for last edit
  - Total CO₂ emissions
- Logs detailed information to a file including:
  - Timestamp of each suggestion
  - File name
  - Inserted text
  - Token count
  - Energy consumption metrics
- Toggle logging on/off via status bar or command
- Debounces suggestions with a 2-second delay to group related changes

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Package the extension: `vsce package`
4. Install the `.vsix` file in VS Code via "Install from VSIX" in the Extensions view

## Usage

1. The extension activates automatically when loaded in VS Code
2. Make edits with GitHub Copilot active
3. View real-time energy stats in the status bar (right side)
4. Click the status bar item to toggle logging on/off
5. Find detailed logs in the extension's global storage path

### Commands

- `githubCopilotEnergy.toggle`: Toggle energy consumption logging
- `githubCopilotEnergy.test`: Test writing to the log file
- `githubCopilotEnergy.start`: Mark the start of energy tracking in the log

## Configuration

The extension uses these constants (defined in the code):
- `MIN_TOKEN_THRESHOLD`: 3 tokens (minimum change to track)
- `JOULES_PER_TOKEN`: 2.16 J (energy per token)
- `suggestionDebounceTime`: 2000 ms (debounce delay)

## Log File Location

Logs are stored in the VS Code global storage path:
- Windows: `%APPDATA%\Code\User\globalStorage\energy_consumption_log.txt`
- Mac: `~/Library/Application Support/Code/User/globalStorage/energy_consumption_log.txt`
- Linux: `~/.config/Code/User/globalStorage/energy_consumption_log.txt`

## Technical Details

- Uses the `tiktoken` library for token counting with GPT-4o encoding
- Debounces text changes to group Copilot suggestions
- Only tracks changes exceeding the minimum token threshold
- Stores running totals for energy and CO₂ emissions