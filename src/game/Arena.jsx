import { useEffect, useRef } from "react";
import { createArena } from "./scene.js";

// Full-viewport WebGL canvas behind the app. The figure is framed on `stageRef`'s box, so it
// sits in the gap between the menu and the panel and follows layout changes.
// `mix` is how far toward night the desert is lit (0 day → 1 night; between = dusk), and
// `intro` plays the opening camera sweep on mount (turning it off mid-way skips the rest).
export default function Arena({ stageRef, onModel, mix = 0, intro = false, danceSignal = 0, bodyMap = null }) {
  const canvasRef = useRef(null);
  const arenaRef = useRef(null);
  const mixRef = useRef(mix);
  const introRef = useRef(intro);
  const bodyMapRef = useRef(bodyMap);
  bodyMapRef.current = bodyMap;
  mixRef.current = mix;
  const onModelRef = useRef(onModel);
  onModelRef.current = onModel;

  useEffect(() => {
    let arena;
    try {
      arena = createArena(canvasRef.current, { onModel: (v) => onModelRef.current?.(v), mix: mixRef.current, intro: introRef.current });
      arenaRef.current = arena;
      if (bodyMapRef.current) arena.setBodyMap(bodyMapRef.current);
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
    arenaRef.current?.setMix(mix);
  }, [mix]);

  useEffect(() => {
    if (!intro) arenaRef.current?.skipIntro();
  }, [intro]);

  useEffect(() => {
    if (bodyMap) arenaRef.current?.setBodyMap(bodyMap);
  }, [bodyMap]);

  // Each bump of danceSignal toggles the cat's dance (the secret tap on the player name).
  useEffect(() => {
    if (danceSignal) arenaRef.current?.toggleCatDance();
  }, [danceSignal]);

  return <canvas ref={canvasRef} className="arena-canvas" aria-hidden="true" />;
}
