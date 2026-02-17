# Pokemon TCG Pocket Battle Simulator

A web-based simulator for Pokemon TCG Pocket battles.

## Project Overview

This project provides a browser-based simulation environment for Pokemon TCG Pocket battles, allowing users to load scenarios, play cards, and manage game state.

## Features

- Battle simulation for Pokemon TCG Pocket
- Scenario loading and saving
- Turn-based gameplay
- Trainer and Supporter card mechanics
- Pokemon retreat functionality
- Predefined deck presets for quick game start
- CLI tool for game automation and testing

## CLI Tool (tcgp)

The `tcgp` command-line interface provides a way to manage Pokemon TCG Pocket battles from the terminal.

### Installation

```bash
npm link  # Install tcgp globally from the project directory
```

Or run directly:
```bash
node bin/tcgp <command> [options]
```

### Config Command

Manage persistent configuration for the tcgp CLI.

```bash
# Get a config value
tcgp config get <key>

# Set a config value
tcgp config set <key> <value>

# List all config values
tcgp config list

# Reset config to defaults
tcgp config reset
```

#### Config Options

- `editor` - Default text editor (default: `vi`)
- `theme` - UI theme (default: `dark`)
- `language` - Display language (default: `en`)
- `timezone` - Timezone setting (default: system timezone)

#### JSON Output

All commands support `--json` flag for machine-readable output:

```bash
tcgp --json config get editor
# Output: {"key":"editor","value":"vi","found":true}

tcgp --json config list
# Output: {"config":{"editor":"vi","theme":"dark",...},"configPath":"/home/user/.tcgp/config.json"}
```

#### Config Storage

Configuration is stored in `~/.tcgp/config.json` (or `$XDG_CONFIG_HOME/tcgp/config.json` if set).

### Other Commands

- `tcgp version` - Show version information
- `tcgp help [command]` - Show help for a command
- `tcgp session` - Manage game sessions (coming soon)
- `tcgp action` - Perform in-game actions (coming soon)

## Getting Started

The simulator runs in a browser environment. See the main codebase for detailed setup and usage instructions.

## License

MIT
