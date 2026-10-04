import { useEffect, useRef, useState } from 'react';

/**
 * Uses the browser Gamepad API only. This can receive controllers that the
 * Android/OS has already exposed as gamepads (including many Bluetooth and
 * 2.4 GHz USB-receiver controllers). It does not scan arbitrary 2.4 GHz RF.
 */
export default function useRemoteController(enabled = true) {
  const [gamepad, setGamepad] = useState(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled || !('getGamepads' in navigator)) return undefined;

    const connect = (e) => setGamepad(e.gamepad);
    const disconnect = (e) => setGamepad(current => current?.index === e.gamepad.index ? null : current);
    window.addEventListener('gamepadconnected', connect);
    window.addEventListener('gamepaddisconnected', disconnect);

    const poll = () => {
      const pads = navigator.getGamepads?.() || [];
      const active = Array.from(pads).find(Boolean);
      if (active) setGamepad({
        id: active.id,
        index: active.index,
        buttons: active.buttons.map(b => Boolean(b.pressed)),
        axes: active.axes.map(v => Number(v.toFixed(3))),
        timestamp: active.timestamp,
      });
      frameRef.current = requestAnimationFrame(poll);
    };
    frameRef.current = requestAnimationFrame(poll);

    return () => {
      window.removeEventListener('gamepadconnected', connect);
      window.removeEventListener('gamepaddisconnected', disconnect);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [enabled]);

  return gamepad;
}