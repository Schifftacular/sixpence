// The three answers wait in the browser while the person signs in with Google.
// Plan answers only (date, guest count, budget). Nothing else is stored here.
export const START_KEY = "sixpence.start.v1";

export function saveStartAnswers(answers: unknown) {
  try {
    localStorage.setItem(START_KEY, JSON.stringify(answers));
  } catch {
    // Private mode or storage blocked: the save page will send them back to /start.
  }
}

export function readStartAnswers(): unknown | null {
  try {
    const raw = localStorage.getItem(START_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStartAnswers() {
  try {
    localStorage.removeItem(START_KEY);
  } catch {}
}
