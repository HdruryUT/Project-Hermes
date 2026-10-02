import { useEffect, useRef } from "react";
import { createArena } from "./scene.js";

// Full-viewport WebGL canvas behind the app. The figure is framed on `stageRef`'s box, so it
// sits in the gap between the menu and the panel and follows layout changes.
export default function Arena({ stageRef, onModel, mode }) {
  const canvasRef = useRef(null);
  const arenaRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onModelRef = useRef(onModel);
  onModelRef.current = onModel;

  useEffect(() => {
    let arena;
    try {
      arena = createArena(canvasRef.current, { onModel: (v) => onModelRef.current?.(v), mode: modeRef.current });
      arenaRef.current = arena;
    } catch (err) {
      console.warn("3D arena unavailable (no WebGL?):", err);
      return;
    }

    const update = () => {
      const el = stageRef.current;
      const r = el?.getBoundingClientRect();
      arena.setFocus(r && r.width > 0 && r.height > 0
        ? { x: r.left + r.width / 2, y: r.top + r.height * 0.4, height: r.height * 0.8 }
        : null);
    };
    update();
    const ro = new ResizeObserver(update);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      arenaRef.current = null;
      arena.dispose();
    };
  }, [stageRef]);

  useEffect(() => {
    arenaRef.current?.setMode(mode);
  }, [mode]);

  return <canvas ref={canvasRef} className="arena-canvas" aria-hidden="true" />;
}
