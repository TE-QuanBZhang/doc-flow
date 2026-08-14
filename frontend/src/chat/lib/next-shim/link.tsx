/**
 * Next.js `<Link>` compatibility shim for the Vite build.
 * Maps href -> to so the ported doc-flow pages work with react-router.
 */
import { Link as RouterLink } from "react-router-dom";

export default function Link({
  href,
  ...props
}: { href: string } & Record<string, unknown>) {
  return <RouterLink to={href} {...props} />;
}
