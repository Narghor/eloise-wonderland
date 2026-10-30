// -----------------------------------------------
// ONE SAVE FOR THE WHOLE SITE
// -----------------------------------------------
// Every game stores its own block under games[<gameId>] and validates it itself.

const STORAGE_KEY = 'mini-jeux.save';
const CORRUPT_KEY = 'mini-jeux.save.corrupt';
const APP_ID = 'mini-jeux';
const SAVE_VERSION = 1;

interface SaveFile {
  app: typeof APP_ID;
  version: number;
  exportedAt?: string;
  games: Record<string, unknown>;
}

function isSaveFile(value: unknown): value is SaveFile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.app === APP_ID &&
    typeof candidate.version === 'number' &&
    typeof candidate.games === 'object' &&
    candidate.games !== null &&
    !Array.isArray(candidate.games)
  );
}

function emptySave(): SaveFile {
  return { app: APP_ID, version: SAVE_VERSION, games: {} };
}

function loadSave(): SaveFile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return emptySave();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSaveFile(parsed)) return parsed;
  } catch {
    // Unreadable JSON: handled below.
  }
  // Set the unreadable text aside so the next write cannot destroy it.
  localStorage.setItem(CORRUPT_KEY, raw);
  return emptySave();
}

function storeSave(save: SaveFile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function readGame(gameId: string): unknown {
  return loadSave().games[gameId];
}

export function writeGame(gameId: string, data: unknown): void {
  const save = loadSave();
  save.games[gameId] = data;
  storeSave(save);
}

// -----------------------------------------------
// EXPORT / IMPORT
// -----------------------------------------------

export function exportSave(): void {
  const save: SaveFile = { ...loadSave(), exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wonderland-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Replaces the whole save with the file's content. Throws an Error with a player-facing message. */
export async function importSave(file: File): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde lisible.");
  }
  if (!isSaveFile(parsed)) throw new Error("Ce fichier n'est pas une sauvegarde de Wonderland.");
  if (parsed.version > SAVE_VERSION) throw new Error("Cette sauvegarde vient d'une version plus récente du site.");
  storeSave({ app: APP_ID, version: SAVE_VERSION, games: parsed.games });
}

/** Asks the browser not to evict our storage when the device runs low on space. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}
