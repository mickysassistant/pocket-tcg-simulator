/**
 * Simple test for ACT-005 evolve action
 */

const { execSync } = require('child_process');
const assert = require('assert');

function execTcgp(args) {
  const binPath = process.cwd() + '/bin/tcgp';

  const escapedArgs = args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes('{') || arg.includes('}')) {
      return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    return arg;
  });

  try {
    const stdout = execSync(`node ${binPath} ${escapedArgs.join(' ')}`, {
      encoding: 'utf8'
    });
    return { stdout, stderr: '', status: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : '',
      status: error.status || 1
    };
  }
}

function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    return null;
  }
}

console.log('=== Simple evolve test ===');

const sessionName = 'simple-test-' + Date.now();

// Create session
const createResult = execTcgp(['session', 'create', sessionName, '--p1', 'deck1', '--p2', 'deck2']);
console.log('Create result:', createResult.status === 0 ? 'OK' : 'FAIL');

// Setup turns to get past turn 0
execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
console.log('Start turn 1 OK');

execTcgp(['action', 'end_turn', '{"playerId":"player1"}', '--session', sessionName]);
console.log('End turn 1 OK');

execTcgp(['action', 'start_turn', '{"playerId":"player2"}', '--session', sessionName]);
console.log('Start turn 2 OK');

execTcgp(['action', 'end_turn', '{"playerId":"player2"}', '--session', sessionName]);
console.log('End turn 2 OK');

execTcgp(['action', 'start_turn', '{"playerId":"player1"}', '--session', sessionName]);
console.log('Start turn 3 OK');

// Evolve with JSON
const evolveResult = execTcgp(['--json', 'action', 'evolve', '{"playerId":"player1","pokemonId":"B1-155","evolutionCardId":"B1-157"}', '--session', sessionName]);
console.log('Evolve result status:', evolveResult.status);
console.log('Evolve result stdout:', evolveResult.stdout.substring(0, 200));
console.log('Evolve result stderr:', evolveResult.stderr);

const json = parseJson(evolveResult.stdout);
console.log('Parsed JSON:', json !== null ? 'OK' : 'FAIL');

if (json) {
  console.log('Action ID:', json.actionId);
  console.log('Pokemon name:', json.pokemon?.name);
  console.log('Current stage:', json.currentStage);
  console.log('Previous stage:', json.previousStage);
}

// Cleanup
try {
  execTcgp(['session', 'close', sessionName]);
} catch (e) {
  // Ignore
}

if (json && json.actionId === 'evolve' && json.currentStage === 'Stage 1') {
  console.log('\n✓ Test PASSED');
  process.exit(0);
} else {
  console.log('\n✗ Test FAILED');
  process.exit(1);
}
