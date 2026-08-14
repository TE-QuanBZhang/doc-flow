/**
 * Next.js `next/navigation` compatibility shim for the Vite build.
 * Maps usePathname -> react-router useLocation, useRouter -> useNavigate.
 */
import { useLocation, useNavigate } from "react-router-dom";

export function usePathname(): string {
  const { pathname } = useLocation();
  return pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    prefetch: () => {},
  };
}

export function useSearchParams() {
  const { search } = useLocation();
  return [new URLSearchParams(search)];
}
