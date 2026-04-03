/**
 * Bluesky API Client for Maiko Publishing
 */

export interface BlueskySession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  timestamp: string;
}

class BlueskyClient {
  private session: BlueskySession | null = null;
  private handle = process.env.BLUESKY_HANDLE || "";
  private password = process.env.BLUESKY_APP_PASSWORD || "";
  private pdsUrl = "https://bsky.social";

  /**
   * Authenticate with Bluesky
   */
  async authenticate(): Promise<void> {
    if (this.session) return; // Already authenticated

    if (!this.handle || !this.password) {
      throw new Error("Missing Bluesky credentials in environment");
    }

    try {
      const response = await fetch(`${this.pdsUrl}/xrpc/com.atproto.server.createSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: this.handle,
          password: this.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.statusText}`);
      }

      this.session = await response.json();
    } catch (error) {
      throw new Error(`Failed to authenticate with Bluesky: ${error}`);
    }
  }

  /**
   * Post to Bluesky
   */
  async post(text: string): Promise<BlueskyPost> {
    if (!this.session) {
      await this.authenticate();
    }

    if (!this.session) {
      throw new Error("Failed to authenticate with Bluesky");
    }

    try {
      // Create post record
      const now = new Date().toISOString();
      const post = {
        $type: "com.atproto.repo.createRecord",
        repo: this.session.did,
        collection: "app.bsky.feed.post",
        record: {
          text,
          createdAt: now,
        },
      };

      const response = await fetch(
        `${this.pdsUrl}/xrpc/com.atproto.repo.createRecord`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.session.accessJwt}`,
          },
          body: JSON.stringify(post.record),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Post failed: ${error.error} - ${error.message}`
        );
      }

      const result = await response.json();
      return {
        uri: result.uri,
        cid: result.cid,
        timestamp: now,
      };
    } catch (error) {
      throw new Error(`Failed to post to Bluesky: ${error}`);
    }
  }

  /**
   * Post multiple posts in sequence
   */
  async postBatch(posts: string[]): Promise<BlueskyPost[]> {
    const results: BlueskyPost[] = [];

    for (const text of posts) {
      try {
        const post = await this.post(text);
        results.push(post);
        // Small delay between posts to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to post: ${error}`);
        // Continue with next post even if one fails
      }
    }

    return results;
  }
}

// Singleton instance
const client = new BlueskyClient();

export async function postToBluesky(text: string): Promise<BlueskyPost> {
  return client.post(text);
}

export async function postBatchToBluesky(
  posts: string[]
): Promise<BlueskyPost[]> {
  return client.postBatch(posts);
}
