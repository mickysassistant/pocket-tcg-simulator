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

### Snapshot Command

Save and restore labeled game state snapshots for testing and debugging.

```bash
# Save a snapshot with a label
tcgp snapshot save <session-name-or-id> <label>

# Load/restore from a snapshot
tcgp snapshot load <session-name-or-id> <label>

# List all snapshots for a session
tcgp snapshot list <session-name-or-id>

# Delete a snapshot
tcgp snapshot delete <session-name-or-id> <label>
```

#### Snapshot Features

- **Labeled snapshots**: Save checkpoints with custom labels (e.g., `before-attack`, `critical-point`)
- **State integrity validation**: Automatic validation when loading snapshots
- **Snapshot list**: View all saved snapshots for a session
- **Snapshot deletion**: Remove snapshots that are no longer needed

#### Example Usage

```bash
# Create a session
tcgp session create my-battle --p1 deck1 --p2 deck2

# Save a snapshot before an important action
tcgp snapshot save my-battle before-attack

# ... perform actions ...

# If something goes wrong, restore the snapshot
tcgp snapshot load my-battle before-attack

# List all snapshots
tcgp snapshot list my-battle

# Clean up a snapshot you no longer need
tcgp snapshot delete my-battle old-checkpoint
```

#### JSON Output

All snapshot commands support `--json` for machine-readable output:

```bash
tcgp --json snapshot save my-battle checkpoint-1
# Output: {"id":1,"sessionId":"...","label":"checkpoint-1","turnNumber":5,...}

tcgp --json snapshot load my-battle checkpoint-1
# Output: {"sessionId":"...","snapshotId":1,"label":"checkpoint-1","validation":{"valid":true,"issues":[]},...}

tcgp --json snapshot list my-battle
# Output: {"sessionId":"...","snapshots":[{"id":1,"label":"checkpoint-1",...}],"count":1}
```

### Action Command

List and validate action payload contracts.

```bash
# List all available actions
 tcgp action list

# Validate payload against action schema
 tcgp action validate draw '{"playerId":"player1","count":2}'

# Show action contract/schema without validating payload
 tcgp action validate evolve

# JSON output for automation
 tcgp --json action list
 tcgp --json action validate attach_energy '{"playerId":"player1","targetPokemonId":"active-1"}'
```

#### Action catalog (CLI-005)

- `draw` payload:
  - `playerId` (required): `player1 | player2`
  - `count` (required): number between 1 and 10
  - `respectHandLimit` (optional): boolean
- `attach_energy` payload:
  - `playerId` (required): `player1 | player2`
  - `targetPokemonId` (required): string
- `evolve` payload:
  - `playerId` (required): `player1 | player2`
  - `pokemonId` (required): string
  - `evolutionCard` (required object):
    - `id` (required): string
    - `name` (required): string
    - `stage` (required): `stage1 | stage2`
    - `hp` (required): number >= 1
- `play_supporter` payload:
  - `playerId` (required): `player1 | player2`
  - `card` (required object):
    - `id` (required): string
    - `name` (required): string
- `end_turn` payload:
  - `playerId` (required): `player1 | player2`
- `start_turn` payload:
  - `playerId` (required): `player1 | player2`

Validation failures return stable reason codes and `valid=false` (e.g. `VALIDATION_ERROR`, `UNKNOWN_ACTION`, `INVALID_JSON`, `INVALID_PAYLOAD_TYPE`).

### Other Commands

- `tcgp version` - Show version information
- `tcgp help [command]` - Show help for a command
- `tcgp config` - Manage configuration
- `tcgp action` - Manage and validate in-game actions
- `tcgp snapshot` - Manage game state snapshots

## Getting Started

The simulator runs in a browser environment. See the main codebase for detailed setup and usage instructions.

## License

MIT
