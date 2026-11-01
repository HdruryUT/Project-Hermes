// App logo — the actual coyote artwork, a lean side-on coyote with its head low, looking
// back over its shoulder. Rendered at a fixed height so it scales cleanly wherever it's used.
import coyoteImg from "../assets/coyote-logo.png";

export default function CoyoteLogo({ size = 44 }) {
  return (
    <img
      src={coyoteImg}
      alt="El Coyote logo"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}
