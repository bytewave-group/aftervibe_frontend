import { ApiError } from "@/lib/api/browser";
import { redirectToLogin } from "@/lib/auth/unauthorized";

export interface LaravelPaginator<T> {
  data?: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export function redirectIfUnauthorized(error: unknown, target: string): void {
  if (error instanceof ApiError && error.status === 401) {
    redirectToLogin(target);
  }
}

export function logApiFallback(label: string, error: unknown): void {
  console.warn(
    label,
    error instanceof ApiError
      ? { status: error.status, message: error.message }
      : error,
  );
}

export async function collectPages<T>(
  fetchPage: (page: number) => Promise<LaravelPaginator<T>>,
  maxPages = 10,
): Promise<T[]> {
  const first = await fetchPage(1);
  const items = [...(first.data ?? [])];
  const lastPage = first.last_page ?? 1;
  for (let page = 2; page <= Math.min(lastPage, maxPages); page += 1) {
    const next = await fetchPage(page);
    items.push(...(next.data ?? []));
  }
  return items;
}
