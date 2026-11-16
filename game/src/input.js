// Keyboard and mouse input, kept apart from the game so the simulation only
// ever reads this one object. Edge-triggered presses are consumed per frame.

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  const clicks = [];
  const mouse = { x: 0, y: 0, down: false };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) justPressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  function onMouseDown(event) {
    updateMouse(event);
    mouse.down = true;
    clicks.push({ x: mouse.x, y: mouse.y });
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,
    keys,
    // Normalised movement direction from the held keys.
    axis() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    // True once for the frame in which the key went down.
    pressed(code) {
      return justPressed.has(code);
    },
    // Drain the clicks that landed on the canvas since the last frame.
    drainClicks() {
      return clicks.splice(0, clicks.length);
    },
    // Call once per simulation step so edge presses last exactly one step.
    endStep() {
      justPressed.clear();
    },
    // Test and screenshot hooks: place the pointer without a real mouse.
    setMouse(x, y) {
      mouse.x = x;
      mouse.y = y;
    },
    queueClick(x, y) {
      clicks.push({ x, y });
    },
    simulateKey(code) {
      justPressed.add(code);
      keys.add(code);
    },
    releaseKey(code) {
      keys.delete(code);
    },
  };
}
