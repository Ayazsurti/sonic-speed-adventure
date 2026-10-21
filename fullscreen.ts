type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => unknown };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => unknown };

export const canFullscreen = (): boolean => {
  const e = document.documentElement as FsEl;
  return !!(e.requestFullscreen || e.webkitRequestFullscreen);
};

export function toggleFullscreen() {
  const d = document as FsDoc;
  const e = document.documentElement as FsEl;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      Promise.resolve(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()).catch(() => {});
    } else {
      Promise.resolve(e.requestFullscreen ? e.requestFullscreen() : e.webkitRequestFullscreen?.()).catch(() => {});
    }
  } catch { /* ignore */ }
}
