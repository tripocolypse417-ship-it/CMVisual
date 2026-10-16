export function asObjectArray(value) {
  return Array.isArray(value) ? value.filter(item => item !== null && typeof item === "object" && !Array.isArray(item)) : [];
}

export function sanitizeTimelineEvents(value) {
  return asObjectArray(value).filter(event =>
    typeof event.eventId === "string" &&
    typeof event.trackId === "string" &&
    typeof event.observedAt === "string" &&
    Number.isFinite(Date.parse(event.observedAt))
  );
}
