# testlogger README

## Overview

The `Copilot Logger` extension logs GitHub Copilot suggestions to a text file for later review and analysis. This can be useful for tracking the AI's suggestions and understanding its behavior over time.

## Features

- Automatically logs all Copilot suggestions to a specified file.
- Configurable log file location.
- Option to include timestamps with each logged suggestion.

## Requirements

- Visual Studio Code v1.60.0 or higher.
- GitHub Copilot extension installed and configured.

## Extension Settings

This extension contributes the following settings:

* `copilotLogger.enable`: Enable/disable the Copilot Logger extension.
* `copilotLogger.logFilePath`: Specify the path to the log file.
* `copilotLogger.includeTimestamps`: Enable/disable timestamps in the log file.

## Known Issues

- Large log files may impact performance.
- Ensure the log file path is writable to avoid permission issues.

## Release Notes

### 1.0.0

Initial release of Copilot Logger.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**

## Contributing

Contributions are welcome! If you have any suggestions, bug reports, or feature requests, please open an issue or submit a pull request on the [GitHub repository](https://github.com/yourusername/copilot-logger).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Thanks to the GitHub Copilot team for creating such an amazing tool.
- Special thanks to all contributors and users who have provided feedback and support.

## Contact

If you have any questions or need further assistance, feel free to reach out:

- Email: yourname@example.com

**Happy Coding!**
```
    ____            _ _       _     _                                 
    / ___|___  _ __ (_) |_ ___| |__ (_)_ __   __ _   _ __ ___   ___  ___ 
   | |   / _ \| '_ \| | __/ __| '_ \| | '_ \ / _` | | '_ ` _ \ / _ \/ __|
   | |__| (_) | | | | | || (__| | | | | | | | (_| |_| | | | | |  __/\__ \
    \____\___/|_| |_|_|\__\___|_| |_|_|_| |_|\__, (_) |_| |_| |_|\___||___/
                                    |___/                         
```