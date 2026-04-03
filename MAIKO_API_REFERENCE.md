# Maiko API Reference

**Complete TypeScript Interface Documentation**

---

## Core Interfaces

### MaikoRequest

Request sent to the Maiko handler.

```typescript
export interface MaikoRequest {
  // Required
  source: string;  // "telegram" | "test" | "chris" | "debug"
  action: string;  // Must be "publish"

  // Conditional (require either query OR posting_packet)
  query?: string;  // Natural language publishing intent
  posting_packet?: PostingPacket;  // Structured draft packet from Cade

  // Platform targeting
  target_platforms?: string[];  // Default: ["x"]
  // Options: "x" | "bluesky" | "threads" | "linkedin"

  // Operating mode
  approval_required?: boolean;  // Default: true
  auto_publish?: boolean;       // Default: false
  auto_reply?: boolean;         // Default: false

  // Timing
  schedule_time?: string;  // ISO 8601 for scheduled publishing

  // Tracing
  trace_id?: string;  // For distributed tracing
}
```

### MaikoResponse

Response returned by the Maiko handler.

```typescript
export interface MaikoResponse {
  ok: boolean;
  action: "publish";
  trace_id?: string;
  brief: string;  // Human-readable summary
  publish_packet?: PublishingPacket;  // Structured output

  // Error fields (if ok: false)
  error_code?: string;
  error_message?: string;
}
```

### PostingPacket

Input from Cade agent (tier-ranked drafts).

```typescript
export interface PostingPacket {
  batch_date: string;  // "2026-04-03"
  timezone: string;    // "Asia/Manila"
  platform_mix: string[];

  total_drafts: number;
  tier_a_ready: DraftCandidate[];
  tier_b_review: DraftCandidate[];
  tier_c_hold: DraftCandidate[];

  source_trace_table?: Map<string, any>;
  batch_health?: any;
  posting_summary?: string;
}
```

### DraftCandidate

Individual draft from Cade.

```typescript
export interface DraftCandidate {
  post_id: string;
  source_item_id: string;  // Trace back to source story
  platform: string;        // "x", "bluesky", etc.
  format: string;          // "single_post", "thread", "reply", "quote_post"
  angle_type: string;      // "breaking", "operator_take", etc.
  hook: string;            // Attention hook / first line
  text: string;            // Full post text
  rationale: string;       // Why this angle works
  confidence: string;      // "high", "medium", "low"
  freshness: string;       // "same-day", "past_24h", "past_72h"
  publish_priority: number; // 0-100 priority score
  source_list: string[];   // Source URLs
  risk_notes: string[];    // Risk flags: ["Low confidence", "Unverified"]
}
```

### PublishingPacket

Output from Maiko handler (publishing decisions).

```typescript
export interface PublishingPacket {
  run_date: string;  // "2026-04-03"
  timezone: string;  // "Asia/Manila"
  
  // Publishing status
  status: "draft" | "approved" | "scheduled" | "published";

  // Decision buckets
  publish_now: SelectedPost[];
  scheduled: ScheduledPost[];
  queue: QueuedPost[];
  held: HeldPost[];
  rejected: RejectedPost[];

  // Metadata
  source_trace: Map<string, StoryTrace>;
  account_health_score: number;  // 0-100
  account_health_notes: string;

  // Operating mode echo
  mode: {
    approval_required: boolean;
    auto_publish: boolean;
    auto_reply: boolean;
  };
}
```

### SelectedPost (Base)

Common interface for all decision buckets.

```typescript
export interface SelectedPost {
  draft_id: string;
  post_text: string;
  platform: string;
  angle_type: string;
  hook: string;
  source_item_id: string;           // Source trace
  source_list: string[];            // Source URLs
  confidence: string;               // Preserved from input
  freshness: string;                // Preserved from input
  publish_score: number;            // 0-100 Maiko score
  publish_decision: string;         // "publish_now", "queue", etc.
  decision_reason: string;          // Why this decision
}
```

### ScheduledPost

Draft scheduled for future publishing.

```typescript
export interface ScheduledPost extends SelectedPost {
  scheduled_time: string;  // ISO 8601 timestamp
}
```

### QueuedPost

Draft queued for human review.

```typescript
export interface QueuedPost extends SelectedPost {
  queue_priority: number;  // Same as publish_score (0-100)
}
```

### HeldPost

Draft on hold for opportunistic use.

```typescript
export interface HeldPost extends SelectedPost {
  hold_reason: string;  // Why it was held
}
```

### RejectedPost

Draft rejected from publishing.

```typescript
export interface RejectedPost extends SelectedPost {
  rejection_reason: string;  // Why it was rejected
}
```

### StoryTrace

Source metadata preserved for accountability.

```typescript
export interface StoryTrace {
  headline: string;
  confidence: string;   // "high", "medium", "low"
  freshness: string;    // "same-day", "past_24h", "past_72h"
  sources: string[];    // URLs
}
```

---

## Parser Interfaces

### ParsedPublishIntent

Result of parsing the publishing query.

```typescript
export interface ParsedPublishIntent {
  action: "draft_only" | "queue_for_review" | "schedule_batch" | "auto_publish";
  target_platforms: string[];
  approval_required: boolean;
  auto_publish: boolean;
  auto_reply: boolean;
  schedule_time?: string;
  batch_size: "small" | "medium" | "large";
  is_valid: boolean;
}
```

---

## Publisher Interfaces

### PublishingDecisions

Internal structure used during selection process.

```typescript
export interface PublishingDecisions {
  publish_now: SelectedPost[];
  scheduled: ScheduledPost[];
  queue: QueuedPost[];
  held: HeldPost[];
  rejected: RejectedPost[];
  account_health_score: number;  // 0-100
}
```

---

## Function Signatures

### Main Handler

```typescript
export async function handleMaikoCommand(
  request: MaikoRequest
): Promise<MaikoResponse>
```

**Behavior:**
1. Validates request (required fields, allowed values)
2. Parses intent from query or request flags
3. Selects and edits drafts
4. Formats output packet
5. Generates human brief
6. Returns response

**Error Codes:** `MISSING_FIELDS`, `INVALID_REQUEST`, `UNPARSEABLE`, `NO_RESEARCH`, `INTERNAL_ERROR`

### Parser Functions

```typescript
export function parsePublishIntent(
  text: string,
  request: MaikoRequest
): ParsedPublishIntent

export function detectPublishingKeywords(text: string): boolean
```

### Publisher Functions

```typescript
export async function selectAndEditDrafts(
  posting_packet: any,
  intent: ParsedPublishIntent,
  request: MaikoRequest
): Promise<PublishingDecisions>

export function calculatePublishScore(draft: DraftCandidate): number
```

### Formatter Functions

```typescript
export function formatPublishingPacket(
  decisions: PublishingDecisions,
  request: MaikoRequest
): PublishingPacket

export function generatePublishBrief(
  publishing_packet: PublishingPacket,
  intent: ParsedPublishIntent
): string
```

---

## Selection Logic

### Tier Classification

```
Input: DraftCandidate (from PostingPacket)
  ↓
Is it in tier_a_ready?  → Tier A
Is it in tier_b_review?  → Tier B
Is it in tier_c_hold?    → Tier C
```

### Auto-Publish Decision

```
If Tier A
  AND confidence == "high"
  AND (freshness == "same-day" OR freshness == "past_24h")
  Then: publish_now (when approval_required=true, still auto-publishes Tier A)
Else If Tier A OR Tier B
  Then: queue (needs review)
Else (Tier C)
  Then: held (opportunistic use)
```

### Rejection Reasons

```
1. "Platform not in target set" — platform not in target_platforms
2. "Critical risk flag present" — has "Do not post" or "unverified"
3. "Low confidence + no source trace" — confidence="low" && no sources
4. "Empty post text" — text is empty or blank
5. "Story saturation limit reached" — >2 posts from same story
6. "Failed validation" — generic validation failure
```

---

## Publish Scoring

### Algorithm

```typescript
score = 50;  // Base

// Confidence (0-25)
if (confidence === "high") score += 25;
else if (confidence === "medium") score += 15;
else if (confidence === "low") score += 5;

// Freshness (0-20)
if (freshness === "same-day") score += 20;
else if (freshness === "past_24h") score += 10;
else if (freshness === "past_72h") score += 5;

// Format (0-10)
if (format === "single_post") score += 10;
else if (format === "thread") score += 8;
else if (format === "reply") score += 5;

// Risk
if (risk_notes.length > 0) score -= 10;

return min(100, max(0, score));
```

### Score Interpretation

| Score | Decision | Notes |
|-------|----------|-------|
| 80-100 | publish_now | Strong candidate |
| 60-79 | queue | Good candidate, needs review |
| 40-59 | queue | Moderate candidate |
| 20-39 | hold | Weak candidate |
| 0-19 | rejected | Not suitable |

---

## Health Scoring

### Algorithm

```typescript
total = publish_now.length + queue.length + held.length;
ready_ratio = publish_now.length / total;
rejected_ratio = rejected.length / total;
queued_ratio = queue.length / total;

health = 100;
if (ready_ratio < 0.2) health -= 20;  // Too few ready
if (rejected_ratio > 0.4) health -= 15; // Too many rejected
if (queued_ratio > 0.7) health -= 10;   // Too many queued

return max(0, health);
```

### Health Report

```
85+ = "healthy"
70-84 = "healthy (with notes)"
50-69 = "review recommended"
<50 = "needs attention"
```

---

## Error Handling

### Validation Errors

```json
{
  "ok": false,
  "action": "publish",
  "error_code": "MISSING_FIELDS",
  "error_message": "Require either query or posting_packet"
}
```

### Processing Errors

```json
{
  "ok": false,
  "action": "publish",
  "error_code": "UNPARSEABLE",
  "error_message": "Could not parse publishing intent from request"
}
```

### Internal Errors

```json
{
  "ok": false,
  "action": "publish",
  "error_code": "INTERNAL_ERROR",
  "error_message": "Internal server error during publishing decision"
}
```

---

## Usage Examples

### Example 1: Basic Publishing Request

```typescript
const request: MaikoRequest = {
  source: "test",
  action: "publish",
  posting_packet: cadePostingPacket,
  approval_required: true,  // Queue everything
  auto_publish: false,
  trace_id: "trace_123"
};

const response = await handleMaikoCommand(request);
// response.publish_packet.publish_now = [];
// response.publish_packet.queue = [3, 4, 5];
// response.publish_packet.held = [6, 7];
// response.publish_packet.rejected = [8];
```

### Example 2: Auto-Publish Mode

```typescript
const request: MaikoRequest = {
  source: "telegram",
  action: "publish",
  posting_packet: cadePostingPacket,
  approval_required: false,  // Allow auto-publish
  auto_publish: true,
  target_platforms: ["x", "bluesky"],
  trace_id: "trace_456"
};

const response = await handleMaikoCommand(request);
// response.publish_packet.publish_now = [1, 2, 3];  // Auto-publishes Tier A
// response.publish_packet.queue = [4];
```

### Example 3: Natural Language Query

```typescript
const request: MaikoRequest = {
  source: "telegram",
  action: "publish",
  query: "publish the strong posts for X",  // Parsed for platforms
  posting_packet: cadePostingPacket,
  approval_required: true,
  trace_id: "trace_789"
};

const response = await handleMaikoCommand(request);
// Parser detects "publish" + "strong" = "queue_for_review"
// Parser detects "X" = target_platforms: ["x"]
```

---

## Integration Points

### Chris Router

```typescript
import { detectPublishingIntent } from "@/agents/chris/router";

if (detectPublishingIntent(userMessage)) {
  // Route to Maiko
  const response = await handleMaikoCommand({
    source: "telegram",
    action: "publish",
    query: userMessage,
    posting_packet: cadePacket  // From recent Cade run
  });
}
```

### Cade Integration

```typescript
import { handleCadeCommand } from "@/lib/cade/handler";

// 1. Get PostingPacket from Cade
const cadeResponse = await handleCadeCommand({...});
const posting_packet = cadeResponse.posting_packet;

// 2. Pass to Maiko
const maikoResponse = await handleMaikoCommand({
  source: "internal",
  action: "publish",
  posting_packet,
  approval_required: true
});
```

### Poster Integration (Future)

```typescript
// When Poster agent is ready:
import { handlePosterCommand } from "@/lib/poster/handler";

for (const post of maikoResponse.publish_packet.publish_now) {
  await handlePosterCommand({
    draft: post,
    platforms: post.platform,
    schedule_time: maikoResponse.publish_packet.run_date
  });
}
```

---

**Last Updated:** 2026-04-03  
**Version:** 1.0 (Production)  
**Stability:** ✅ Stable, Locked for Production
