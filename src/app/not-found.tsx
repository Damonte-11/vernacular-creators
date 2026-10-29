import Link from "next/link";
import { buttonClass, StatusPage } from "@/components/ui";

export default function NotFound() {
  return (
    <StatusPage
      title="Page not found"
      body="The link may be wrong, or the list may have been deleted."
      action={
        <Link href="/" className={buttonClass.primary}>
          Go to the home page
        </Link>
      }
    />
  );
}
