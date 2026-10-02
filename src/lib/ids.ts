let seq = 0;
/** Short, collision-resistant id. Stable within a session, unique across saves. */
export const nid = (): string => `i${++seq}${Date.now().toString(36)}`;
