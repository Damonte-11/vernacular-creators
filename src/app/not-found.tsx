import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-lg font-bold">Page not found</p>
      <p className="mt-2 text-sm text-ink-2">The link may be wrong, or the shortlist may have been deleted.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-accent-ink hover:underline">
        Go to the home page
      </Link>
    </div>
  );
}
