/**
 * Full-viewport 45° stripe field sitting just above the flat `bg-tertiary`
 * backdrop in the root layout. Two overlaid bands per period — a wide white
 * wash plus a thin secondary hairline — keep it legible on the dark base
 * without competing with page content.
 */
export default function BackgroundStripes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg," +
          " rgba(255,255,255,0.05) 0 18px," +
          " transparent 18px 38px," +
          " rgba(255,199,44,0.07) 38px 42px," +
          " transparent 42px 62px)",
      }}
    />
  );
}
