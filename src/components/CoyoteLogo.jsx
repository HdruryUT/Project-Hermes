// App logo — the coyote off the El Coyote cap: lean, walking side-on with its head low, in
// spotted cream embroidery outlined in orange, on a brown canvas patch with an orange rope edge.
import { useId } from "react";

const BODY =
  "M24 28 C40 21 60 21 71 26 L75 28 L78 30 L78 17 L83 27 L87 15 L88.5 28 L91 30 L98 38 L97 41.5 L90 42.5 " +
  "L83 44 L77 47 L78.5 72 L81.5 76 L76 77.5 L73.5 53 L70.5 55 L69 73 L70 77.5 L64.5 77.5 L65 52 " +
  "C56 50 44 50 37 50 L38.5 62 L35.5 75.5 L38.5 77.5 L32.5 78 L31.5 64 L30 55 L27 59 L23.5 75.5 " +
  "L25.5 77.5 L19.5 78 L21 62 L22.5 49 L21 43 C16 49 11.5 57 8.5 66 L3.5 65 C3.5 51 11 36 24 28 Z";

// Spots on the coat, in the 100 × 80 drawing box: [x, y, size, rotation].
const SPOTS = [
  [30, 33, 2.6, -20], [38, 29, 1.6, -15], [45, 28, 3, -10], [54, 27, 1.8, 0], [61, 29, 2.8, 10], [69, 31, 1.5, 15],
  [35, 39, 1.9, -10], [42, 35, 1.4, 0], [50, 35, 2.6, 5], [59, 36, 1.6, 10], [66, 39, 2.4, 20], [47, 43, 1.5, 0],
  [56, 44, 2, 0], [74, 51, 1.6, 80], [29, 46, 1.6, 0], [16, 47, 1.8, -60], [12, 56, 1.6, -70],
];

export default function CoyoteLogo({ size = 44 }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="El Coyote logo">
      <defs>
        {/* canvas twill for the patch, and satin-stitch threads for the embroidered coat */}
        <pattern id={`${id}twill`} width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1" height="2" fill="#ffffff" fillOpacity="0.035" />
        </pattern>
        <pattern id={`${id}satin`} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <rect width="2.4" height="0.7" fill="#ffffff" fillOpacity="0.35" />
          <rect y="1.2" width="2.4" height="0.5" fill="#5a4636" fillOpacity="0.18" />
        </pattern>
        <radialGradient id={`${id}sheen`} cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      {/* patch: brown canvas, orange rope edge, cream running stitch */}
      <circle cx="32" cy="32" r="30" fill="#4a2f1e" />
      <circle cx="32" cy="32" r="30" fill={`url(#${id}twill)`} />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#e8913a" strokeWidth="3.4" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#a95a1c" strokeWidth="3.4" strokeDasharray="1 2.2" />
      <circle cx="32" cy="32" r="25.6" fill="none" stroke="#f0e1c4" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="1.8 1.4" />
      <g transform="translate(7.5 12) scale(0.49)">
        {/* lean coyote in a 100 × 80 box, walking right, head low with big ears, bushy tail hanging */}
        <path d={BODY} fill="#ded5c6" stroke="#e8913a" strokeWidth="2.3" strokeLinejoin="round" />
        <path d={BODY} fill={`url(#${id}satin)`} />
        {/* inner ears, muzzle, eye, nose */}
        <path d="M79.6 21 L82 27 L79.8 28 Z M86.6 19.5 L87.4 27.6 L85 28 Z" fill="#e8913a" />
        <path d="M91 31.5 L98 38 L97 41.5 L90 42.5 L88 36 Z" fill="#c6b49a" />
        <circle cx="88.6" cy="33" r="1.5" fill="#2a170a" />
        <circle cx="97.6" cy="39.6" r="1.4" fill="#2a170a" />
        {/* the embroidered coat's grey-brown spots */}
        {SPOTS.map(([x, y, r, rot], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.55} transform={`rotate(${rot} ${x} ${y})`} fill={i % 3 ? "#7c6754" : "#4f3a2b"} />
        ))}
        <path d="M5 58 C5 61 5.5 63.5 6.5 65.5 L3.6 65 C3.4 62 3.6 60 5 58 Z" fill="#4f3a2b" />
      </g>
      {/* soft light across the raised patch */}
      <circle cx="32" cy="32" r="28.3" fill={`url(#${id}sheen)`} />
    </svg>
  );
}
