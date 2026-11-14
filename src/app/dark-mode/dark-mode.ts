type Theme = 'light' | 'dark';

const LOGO_SELECTOR = 'img[src*="join-logo" i]';
const HOTSPOT = { left: 14, top: 22, width: 24, height: 22 };
const MIN_TOUCH_SIZE = 28;

type Box = { left: number; top: number; right: number; bottom: number };
const DEBUG = false;
const STORAGE_KEY = 'join-theme';
const root = document.documentElement;

/**
 * Liest das gespeicherte Theme aus dem Browser-Speicher.
 * @returns das gespeicherte Theme oder null, wenn keins vorhanden oder der Speicher blockiert ist
 */
function readSavedTheme(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}


/**
 * Speichert das gewählte Theme im Browser-Speicher.
 * @param theme das Theme, das gespeichert werden soll
 */
function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    return;
  }
}


/**
 * Setzt das Theme am Root-Element und speichert es.
 * @param theme das Theme, das aktiv werden soll
 */
function applyTheme(theme: Theme): void {
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  saveTheme(theme);
}


/**
 * Wechselt zwischen hellem und dunklem Theme.
 */
function toggleTheme(): void {
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}


/**
 * Berechnet die Klickfläche (Hotspot) um das blaue Viereck in Pixeln.
 * Bei kleinen Logos (z. B. mobil im Header) wird sie auf Touch-Größe vergrößert,
 * bleibt aber innerhalb des Logos.
 * @param r die Maße des Logos
 * @returns die Klickfläche in Pixeln
 */
function hotspotBox(r: DOMRect): Box {
  const w = Math.max((r.width * HOTSPOT.width) / 100, MIN_TOUCH_SIZE);
  const h = Math.max((r.height * HOTSPOT.height) / 100, MIN_TOUCH_SIZE);
  const cx = r.left + (r.width * (HOTSPOT.left + HOTSPOT.width / 2)) / 100;
  const cy = r.top + (r.height * (HOTSPOT.top + HOTSPOT.height / 2)) / 100;
  return {
    left: Math.max(r.left, cx - w / 2),
    top: Math.max(r.top, cy - h / 2),
    right: Math.min(r.right, cx + w / 2),
    bottom: Math.min(r.bottom, cy + h / 2),
  };
}


/**
 * Prüft, ob ein Klick auf dem blauen Viereck im Logo liegt.
 * @param e das Klick-Event
 * @param logo das Logo-Element, auf das geklickt wurde
 * @returns true, wenn der Klick im Hotspot liegt
 */
function isInHotspot(e: MouseEvent, logo: Element): boolean {
  const r = logo.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const b = hotspotBox(r);
  return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
}


/**
 * Behandelt Klicks auf das Logo und schaltet das Theme um, wenn der Hotspot getroffen wird.
 * @param e das Klick-Event
 */
function onLogoClick(e: MouseEvent): void {
  const logo = (e.target as Element | null)?.closest?.(LOGO_SELECTOR);
  if (!logo || !isInHotspot(e, logo)) return;
  e.preventDefault();
  e.stopPropagation();
  toggleTheme();
}


/**
 * Berechnet die Position und das Aussehen des roten Debug-Rahmens um den Hotspot.
 * @param r die Maße des Logos
 * @returns die Style-Werte für den Rahmen
 */
function debugBoxStyle(r: DOMRect): Partial<CSSStyleDeclaration> {
  const b = hotspotBox(r);
  return {
    position: 'fixed',
    pointerEvents: 'none',
    border: '1px solid red',
    zIndex: '99999',
    left: `${b.left}px`,
    top: `${b.top}px`,
    width: `${b.right - b.left}px`,
    height: `${b.bottom - b.top}px`,
  };
}


/**
 * Zeichnet für jedes Logo einen roten Rahmen um den Hotspot (nur zum Debuggen).
 */
function drawDebugOverlay(): void {
  document.querySelectorAll(LOGO_SELECTOR).forEach((logo) => {
    const box = document.createElement('div');
    Object.assign(box.style, debugBoxStyle(logo.getBoundingClientRect()));
    document.body.appendChild(box);
  });
}


/**
 * Startet den Dark Mode: lädt das gespeicherte Theme und hört auf Klicks im Logo-Hotspot.
 */
export function initDarkMode(): void {
  if (readSavedTheme() === 'dark') applyTheme('dark');
  document.addEventListener('click', onLogoClick, true);
  if (DEBUG) window.addEventListener('load', drawDebugOverlay);
}