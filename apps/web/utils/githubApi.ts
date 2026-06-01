import { Endpoints } from '@octokit/types';
import 'isomorphic-fetch';

const CACHE_DURATION = 60 * 60 * 1000 * 24 // 24 hours
const GITHUB_OWNER = 'Supersynergy'

let releasesCache: {
  [repo: string]: { data: Release[]; ts: number }
} = {}

type Release = Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][number]

function normalizeReleases(data: unknown): Release[] {
  return Array.isArray(data) ? data : []
}

async function fetchReleases(repo: string) {
  const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/releases?per_page=100`)
  return normalizeReleases(await resp.json())
}

export const getReleases = async (
  repo = 'mdviewy'
): Promise<Release[]> => {
  const now = Date.now()
  const isBrowser = typeof window !== 'undefined'

  if (isBrowser) {
    const cacheStr = localStorage.getItem(`releasesCache_${repo}`)
    if (cacheStr) {
      try {
        const cache = JSON.parse(cacheStr)
        if (now - cache.ts < CACHE_DURATION) {
          return normalizeReleases(cache.data)
        }
      } catch {}
    }
    const data = await fetchReleases(repo)
    localStorage.setItem(`releasesCache_${repo}`, JSON.stringify({ data, ts: now }))
    return data
  } else {
    const cache = releasesCache[repo]
    if (cache && now - cache.ts < CACHE_DURATION) {
      return cache.data
    }
    const data = await fetchReleases(repo)
    releasesCache[repo] = { data, ts: now }
    return data
  }
}
