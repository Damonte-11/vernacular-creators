/**
 * The creator shapes for the dark bands. On the Vernacular website creators are the purple oval
 * (agencies the cyan square, brands orange), so the creator side carries ovals instead of squares.
 */
export function BandShapes() {
  return (
    <>
      <span className="pointer-events-none absolute -right-8 -top-10 hidden h-32 w-40 rounded-[50%] bg-accent-bright sm:block" aria-hidden />
      <span className="pointer-events-none absolute right-24 top-16 hidden h-14 w-[72px] rounded-[50%] bg-rail sm:block" aria-hidden />
    </>
  );
}
