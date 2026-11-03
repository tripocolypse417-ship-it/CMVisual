const COMMANDS = [
  [/^(start|begin|resume) navigation$/, 'START_NAVIGATION'],
  [/^(stop|cancel|end) navigation$/, 'STOP_NAVIGATION'],
  [/^(repeat|say) (the )?(directions|instruction|instructions)$/, 'REPEAT_DIRECTIONS'],
  [/^(next turn|next direction|continue route)$/, 'NEXT_TURN'],
  [/^(previous turn|back one turn)$/, 'PREVIOUS_TURN'],
  [/^(where am i|read my location|current location)$/, 'READ_LOCATION'],
  [/^(read|list|announce) (the )?hazards$/, 'READ_HAZARDS'],
  [/^(show|display) (the )?route$/, 'SHOW_ROUTE'],
  [/^(hide|clear) (the )?route$/, 'HIDE_ROUTE'],
  [/^(help|what can i say)$/, 'VOICE_HELP'],
];

export function parseVoiceNavigationCommand(transcript) {
  if (typeof transcript !== 'string') return null;
  const normalized = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, ' ');
  return COMMANDS.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

export const VOICE_NAVIGATION_HELP = Object.freeze([
  'Start navigation', 'Stop navigation', 'Repeat directions', 'Next turn',
  'Previous turn', 'Where am I', 'Read hazards', 'Show route', 'Hide route', 'Help',
]);
