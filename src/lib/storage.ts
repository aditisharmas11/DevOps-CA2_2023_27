import { signReportPhotos } from "@/lib/reports.functions";

const SIGN_TTL_MS = 1000 * 60 * 60 * 24 * 7 - 60_000; // 7 days minus buffer
const cache = new Map<string, { url: string; expires: number }>();

export async function signImagePaths(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const need: string[] = [];
  const result: Record<string, string> = {};

  for (const p of paths) {
    const c = cache.get(p);
    if (c && c.expires > now) result[p] = c.url;
    else need.push(p);
  }
  if (need.length === 0) return result;

  const signed = await signReportPhotos({ data: { paths: need } });
  for (const [path, url] of Object.entries(signed)) {
    cache.set(path, { url, expires: now + SIGN_TTL_MS });
    result[path] = url;
  }
  return result;
}
