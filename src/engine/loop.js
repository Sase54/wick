// requestAnimationFrame loop with delta time.
// Long frames are split into sub-steps of at most 1/60 s so collisions stay stable.
const MAX_STEP = 1 / 60;
const MAX_FRAME = 0.1;

export function startLoop({ frameStart, update, render, frameEnd }) {
  let last = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    if (dt < 0) dt = 0;

    frameStart?.(dt);
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP - 0.05));
    const sub = dt / steps;
    for (let i = 0; i < steps; i++) update(sub);
    render(dt);
    frameEnd?.(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop: () => (running = false) };
}
