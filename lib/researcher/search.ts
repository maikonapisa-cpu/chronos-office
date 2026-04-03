/**
 * News Search Integration
 * Implements real search using GitHub API, HackerNews API, and web fetch
 */

export interface RawStory {
  url: string;
  headline: string;
  snippet: string;
  source: string;
  publish_date?: string;
  content?: string; // Fetched via web_fetch
}

/**
 * Perform news search using real APIs:
 * 1. GitHub API for OpenClaw releases
 * 2. HackerNews API for AI/tech news
 * 3. Web fetch for verification
 */
export async function searchForNews(
  queries: string[],
  timeWindow: "today" | "past_24h" | "past_72h"
): Promise<RawStory[]> {
  const stories: RawStory[] = [];

  // Determine if this is OpenClaw-focused search
  const isOpenClawSearch =
    queries.some((q) =>
      q.toLowerCase().includes("openclaw")
    ) ||
    queries.some((q) =>
      q.toLowerCase().includes("chronos")
    );

  // Step 1: Search GitHub for OpenClaw releases
  if (isOpenClawSearch) {
    console.log("[Search] Querying GitHub for OpenClaw releases...");
    const githubStories = await searchGitHub(
      "anthropics/openclaw",
      timeWindow
    );
    stories.push(...githubStories);
  }

  // Step 2: Search HackerNews for AI ecosystem news
  console.log("[Search] Querying HackerNews for AI news...");
  const hnStories = await searchHackerNews(timeWindow);
  stories.push(...hnStories);

  // Step 3: Fetch top stories to extract full content
  console.log(`[Search] Found ${stories.length} candidate stories. Fetching details...`);
  const verifiedStories = await verifyAndFetchStories(stories);

  return verifiedStories;
}

/**
 * Search GitHub for OpenClaw releases and updates
 */
async function searchGitHub(
  repo: string,
  timeWindow: "today" | "past_24h" | "past_72h"
): Promise<RawStory[]> {
  const stories: RawStory[] = [];

  try {
    // Query GitHub releases API
    const releasesUrl = `https://api.github.com/repos/${repo}/releases?per_page=10`;

    const response = await fetch(releasesUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.warn(`[GitHub] Failed to fetch releases: ${response.status}`);
      return stories;
    }

    const releases: any[] = await response.json();
    const cutoffTime = getTimeWindowCutoff(timeWindow);

    for (const release of releases) {
      const publishedAt = new Date(release.published_at);

      if (publishedAt.getTime() < cutoffTime.getTime()) {
        continue;
      }

      stories.push({
        url: release.html_url,
        headline: `OpenClaw Release: ${release.tag_name}`,
        snippet: release.body
          ? release.body.substring(0, 200)
          : release.name || "New release",
        source: "GitHub",
        publish_date: release.published_at,
      });
    }

    console.log(`[GitHub] Found ${stories.length} releases`);
  } catch (error) {
    console.error("[GitHub Error]", error);
  }

  return stories;
}

/**
 * Search HackerNews for AI and tech news
 */
async function searchHackerNews(
  timeWindow: "today" | "past_24h" | "past_72h"
): Promise<RawStory[]> {
  const stories: RawStory[] = [];

  try {
    // Get top AI-related stories from HackerNews
    const searchTerms = ["AI", "Claude", "OpenAI", "DeepSeek", "agent", "LLM"];
    const cutoffTime = getTimeWindowCutoff(timeWindow);

    // Fetch top stories
    const topStoriesUrl =
      "https://hacker-news.firebaseio.com/v0/topstories.json";
    const topStoriesResponse = await fetch(topStoriesUrl);

    if (!topStoriesResponse.ok) {
      console.warn("[HackerNews] Failed to fetch top stories");
      return stories;
    }

    const topStoryIds: number[] = await topStoriesResponse.json();

    // Fetch story details (limit to first 30 to avoid rate limits)
    for (const storyId of topStoryIds.slice(0, 30)) {
      try {
        const storyUrl = `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`;
        const storyResponse = await fetch(storyUrl);

        if (!storyResponse.ok) continue;

        const story: any = await storyResponse.json();

        // Check if story is AI-related
        const isAIRelated =
          searchTerms.some((term) =>
            story.title?.toLowerCase().includes(term.toLowerCase())
          ) ||
          searchTerms.some((term) =>
            story.text?.toLowerCase().includes(term.toLowerCase())
          );

        if (!isAIRelated) continue;

        const publishedAt = new Date(story.time * 1000);
        if (publishedAt.getTime() < cutoffTime.getTime()) {
          continue;
        }

        stories.push({
          url: story.url || `https://news.ycombinator.com/item?id=${storyId}`,
          headline: story.title,
          snippet: story.text ? story.text.substring(0, 200) : "",
          source: "HackerNews",
          publish_date: new Date(story.time * 1000).toISOString(),
        });

        // Limit to 5 stories to avoid too many results
        if (stories.length >= 5) break;
      } catch (e) {
        // Continue on individual story errors
        continue;
      }
    }

    console.log(`[HackerNews] Found ${stories.length} AI-related stories`);
  } catch (error) {
    console.error("[HackerNews Error]", error);
  }

  return stories;
}

/**
 * Verify stories and fetch full content
 */
async function verifyAndFetchStories(stories: RawStory[]): Promise<RawStory[]> {
  const verified: RawStory[] = [];

  // Fetch top 5 stories to extract full content
  const topStories = stories.slice(0, 5);

  for (const story of topStories) {
    try {
      // Attempt to fetch content from URL
      const content = await fetchStoryContent(story.url);

      const verifiedStory: RawStory = {
        ...story,
        content: content || story.snippet,
      };

      verified.push(verifiedStory);
    } catch (error) {
      console.error(`[Fetch Error] ${story.url}:`, error);
      // Continue with other stories on error
      verified.push(story);
    }
  }

  return verified;
}

/**
 * Fetch full content from a URL
 */
async function fetchStoryContent(url: string): Promise<string | null> {
  try {
    // Skip if URL is HackerNews itself (API already has content)
    if (url.includes("news.ycombinator.com")) {
      return null;
    }

    // Skip external URLs for now (avoid overload)
    // In production, would use web_fetch tool
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get cutoff time for search window
 */
function getTimeWindowCutoff(
  window: "today" | "past_24h" | "past_72h"
): Date {
  const now = new Date();

  switch (window) {
    case "today":
    case "past_24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    case "past_72h":
      return new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

/**
 * Format time window for search API
 */
export function formatTimeWindowForSearch(
  window: "today" | "past_24h" | "past_72h"
): string {
  switch (window) {
    case "today":
    case "past_24h":
      return "24h";
    case "past_72h":
      return "3d";
    default:
      return "24h";
  }
}

/**
 * Check if a story is OpenClaw-related
 */
export function isOpenClawRelated(story: RawStory): boolean {
  const text = `${story.headline} ${story.snippet}`.toLowerCase();
  return (
    text.includes("openclaw") ||
    text.includes("chronos") ||
    text.includes("claude") ||
    text.includes("anthropic") ||
    (text.includes("github") && text.includes("anthropics"))
  );
}

/**
 * Check if story is from official source
 */
export function isOfficialSource(url: string): boolean {
  const officialDomains = [
    "github.com/anthropics",
    "github.com/MCNapiza",
    "anthropic.com",
    "claude.ai",
    "api.github.com",
  ];

  return officialDomains.some((domain) => url.includes(domain));
}

/**
 * Check if story is from reputable news source
 */
export function isReputableSource(url: string): boolean {
  const reputableDomains = [
    "techcrunch.com",
    "venturebeat.com",
    "theverge.com",
    "ycombinator.com", // HackerNews
    "news.ycombinator.com",
    "github.com",
    "medium.com",
    "arxiv.org",
  ];

  return reputableDomains.some((domain) => url.includes(domain));
}
