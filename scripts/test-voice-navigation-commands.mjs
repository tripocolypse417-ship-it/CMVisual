import assert from 'node:assert/strict';
import { parseVoiceNavigationCommand, VOICE_NAVIGATION_HELP } from '../src/lib/voiceNavigationCommands.js';

const cases = [
  ['Start navigation', 'START_NAVIGATION'],
  ['resume navigation', 'START_NAVIGATION'],
  ['cancel navigation', 'STOP_NAVIGATION'],
  ['repeat the directions', 'REPEAT_DIRECTIONS'],
  ['next turn', 'NEXT_TURN'],
  ['previous turn', 'PREVIOUS_TURN'],
  ['Where am I?', 'READ_LOCATION'],
  ['read the hazards', 'READ_HAZARDS'],
  ['display route', 'SHOW_ROUTE'],
  ['hide the route', 'HIDE_ROUTE'],
  ['what can I say?', 'VOICE_HELP'],
];
for (const [phrase, expected] of cases) assert.equal(parseVoiceNavigationCommand(phrase), expected, phrase);
assert.equal(parseVoiceNavigationCommand('turn the lights on'), null);
assert.equal(parseVoiceNavigationCommand(null), null);
assert.equal(VOICE_NAVIGATION_HELP.length, 10);
console.log('Helmet voice navigation phrase tests passed.');
