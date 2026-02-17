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

### Session Command

Manage persistent game sessions.

```bash
# Create a session (required: --p1 and --p2, optional --seed)
tcgp session create <name> --p1 <deck-id> --p2 <deck-id> [--seed <seed>]

# List sessions
tcgp session list

# List only active/completed sessions
tcgp session list --status active

# Show session details and current state
tcgp session show <name-or-id>

# Close a session (status -> completed)
tcgp session close <name-or-id>
```

### Other Commands

- `tcgp version` - Show version information
- `tcgp help [command]` - Show help for a command
- `tcgp config` - Manage configuration
- `tcgp action` - Perform in-game actions (coming soon)

## Getting Started

The simulator runs in a browser environment. See the main codebase for detailed setup and usage instructions.

## License

MIT
