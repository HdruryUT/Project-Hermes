// App logo — winged Hermes with the caduceus.
import logoUrl from "../assets/hermes-logo.png";

export default function HermesLogo({ size = 44 }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="Project Hermes logo"
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
