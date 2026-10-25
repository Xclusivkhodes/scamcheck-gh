import Link from "next/link";
import { Shell } from "@/components/shell";

export default function NotFound() {
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">404</p>
        <h1 className="t-h1">This page is not here</h1>
        <p>The link may be old. You can still check a message.</p>
        <p>
          <Link className="btn btn-primary btn-md" href="/">
            Check a message
          </Link>
        </p>
      </article>
    </Shell>
  );
}
