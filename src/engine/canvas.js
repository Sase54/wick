// Fixed low-res canvas, scaled up with crisp pixels and letterboxed inside the safe area.
export const VIEW_W = 384;
export const VIEW_H = 216;

export function readSafeArea() {
  const probe = document.getElementById('safe-probe');
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

export function createDisplay(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const display = { canvas, ctx, scale: 1, left: 0, top: 0 };

  function fit() {
    const safe = readSafeArea();
    const availW = Math.max(1, window.innerWidth - safe.left - safe.right);
    const availH = Math.max(1, window.innerHeight - safe.top - safe.bottom);
    let scale = Math.min(availW / VIEW_W, availH / VIEW_H);

    // Snap to a whole number of physical pixels per game pixel when it costs little,
    // so every game pixel is the same size.
    const dpr = window.devicePixelRatio || 1;
    const phys = scale * dpr;
    if (phys >= 2 && Math.floor(phys) / phys > 0.88) scale = Math.floor(phys) / dpr;

    const w = Math.round(VIEW_W * scale);
    const h = Math.round(VIEW_H * scale);
    display.scale = scale;
    display.left = Math.round(safe.left + (availW - w) / 2);
    display.top = Math.round(safe.top + (availH - h) / 2);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.left = display.left + 'px';
    canvas.style.top = display.top + 'px';
    ctx.imageSmoothingEnabled = false;
  }

  // Convert a page coordinate to a game-view coordinate.
  display.toView = (clientX, clientY) => ({
    x: (clientX - display.left) / display.scale,
    y: (clientY - display.top) / display.scale,
  });

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 120));
  fit();
  display.fit = fit;
  return display;
}
