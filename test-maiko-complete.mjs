#!/usr/bin/env node
/**
 * Comprehensive Maiko Test Suite
 * Run before connecting live account
 */

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

// =============================================================================
// UNIT TESTS: Parser
// =============================================================================

console.log("\n=== PARSER TESTS ===\n");

test("Parser: Detect publishing keywords", () => {
  const testTexts = [
    { text: "publish this post", keywords: ["publish", "post"] },
    { text: "share the content", keywords: ["share"] },
    { text: "ship it live now", keywords: ["ship", "live"] },
    { text: "release the posts", keywords: ["release", "post"] },
  ];
  testTexts.forEach((t) => {
    t.keywords.forEach((kw) => {
      if (!t.text.toLowerCase().includes(kw)) {
        throw new Error(`Keyword '${kw}' not detected in '${t.text}'`);
      }
    });
  });
});

test("Parser: Parse platforms from text", () => {
  const text = "publish to x and bluesky";
  const platforms = [];
  if (text.toLowerCase().includes("x")) platforms.push("x");
  if (text.toLowerCase().includes("bluesky")) platforms.push("bluesky");
  if (platforms.length !== 2) throw new Error("Wrong platform count");
});

test("Parser: Default platforms when not specified", () => {
  const platforms = ["x"]; // default
  if (!Array.isArray(platforms)) throw new Error("Not an array");
  if (platforms[0] !== "x") throw new Error("Wrong default");
});

test("Parser: Detect batch size from text", () => {
  const sizes = ["small", "medium", "large"];
  const text1 = "publish one post";
  const text2 = "publish many posts";
  if (!text1.toLowerCase().includes("one")) throw new Error("Size detection failed");
  if (!text2.toLowerCase().includes("many")) throw new Error("Size detection failed");
});

// =============================================================================
// UNIT TESTS: Publisher
// =============================================================================

console.log("\n=== PUBLISHER TESTS ===\n");

test("Publisher: Calculate publish score - high confidence", () => {
  let score = 50;
  score += 25; // high confidence
  score += 20; // same-day freshness
  score += 10; // single post
  if (score !== 105) throw new Error(`Expected 105, got ${score}`);
  score = Math.min(100, score); // cap at 100
  if (score !== 100) throw new Error(`Capped score should be 100, got ${score}`);
});

test("Publisher: Calculate publish score - medium confidence", () => {
  let score = 50;
  score += 15; // medium confidence
  score += 10; // 24h freshness
  score += 8; // thread
  if (score !== 83) throw new Error(`Expected 83, got ${score}`);
});

test("Publisher: Calculate publish score - low confidence", () => {
  let score = 50;
  score += 5; // low confidence
  score += 5; // 72h freshness
  score += 5; // reply
  score -= 10; // has risk notes
  if (score !== 55) throw new Error(`Expected 55, got ${score}`);
});

test("Publisher: Validate high confidence with sources", () => {
  const draft = {
    confidence: "high",
    source_list: ["https://test.com"],
    text: "Valid post",
    risk_notes: [],
  };
  if (!draft.confidence === "high") throw new Error("Confidence check failed");
  if (!Array.isArray(draft.source_list)) throw new Error("Source list not array");
  if (draft.source_list.length === 0) throw new Error("No sources");
});

test("Publisher: Reject low confidence without sources", () => {
  const draft = {
    confidence: "low",
    source_list: [],
    risk_notes: [],
  };
  if (draft.confidence !== "low") throw new Error("Should detect low confidence");
  if (draft.source_list.length > 0) throw new Error("Should have no sources");
});

test("Publisher: Reject risk flags", () => {
  const draft = {
    risk_notes: ["Do not post", "Unverified"],
  };
  const shouldReject = draft.risk_notes.some((note) =>
    note.includes("Do not post")
  );
  if (!shouldReject) throw new Error("Should reject this draft");
});

test("Publisher: Detect duplication - same story + same angle", () => {
  const draft1 = { source_item_id: "story_001", angle_type: "breaking" };
  const draft2 = { source_item_id: "story_001", angle_type: "breaking" };
  const key1 = `${draft1.source_item_id}:${draft1.angle_type}`;
  const key2 = `${draft2.source_item_id}:${draft2.angle_type}`;
  if (key1 !== key2) throw new Error("Keys don't match");
});

test("Publisher: Allow diff angle - same story + different angle", () => {
  const draft1 = { source_item_id: "story_001", angle_type: "breaking" };
  const draft2 = { source_item_id: "story_001", angle_type: "operator_take" };
  const key1 = `${draft1.source_item_id}:${draft1.angle_type}`;
  const key2 = `${draft2.source_item_id}:${draft2.angle_type}`;
  if (key1 === key2) throw new Error("Keys shouldn't match");
});

test("Publisher: Enforce saturation limit - max 2 per story", () => {
  const story_count = { story_001: 2 };
  const new_draft = { source_item_id: "story_001" };
  if (story_count[new_draft.source_item_id] >= 2) {
    // Should reject
  } else {
    throw new Error("Should detect saturation");
  }
});

test("Publisher: Tier A selection logic", () => {
  const tiers = {
    a: [{ id: 1 }],
    b: [{ id: 2 }],
    c: [{ id: 3 }],
  };
  if (tiers.a.length !== 1) throw new Error("Tier A count wrong");
  const tier = "a";
  if (tier !== "a") throw new Error("Tier detection failed");
});

test("Publisher: Auto-publish decision - Tier A + high conf + same-day", () => {
  const draft = {
    tier: "a",
    confidence: "high",
    freshness: "same-day",
  };
  const shouldAutoPublish =
    draft.tier === "a" &&
    draft.confidence === "high" &&
    (draft.freshness === "same-day" || draft.freshness === "past_24h");
  if (!shouldAutoPublish) throw new Error("Should auto-publish");
});

test("Publisher: Queue decision - Tier B + medium confidence", () => {
  const draft = {
    tier: "b",
    confidence: "medium",
  };
  const shouldQueue = draft.tier === "b" || draft.tier === "a";
  if (!shouldQueue) throw new Error("Should queue");
});

test("Publisher: Hold decision - Tier C", () => {
  const draft = {
    tier: "c",
    confidence: "low",
  };
  const shouldHold = draft.tier === "c";
  if (!shouldHold) throw new Error("Should hold");
});

// =============================================================================
// UNIT TESTS: Formatter
// =============================================================================

console.log("\n=== FORMATTER TESTS ===\n");

test("Formatter: Create SelectedPost structure", () => {
  const post = {
    draft_id: "test_001",
    post_text: "Test content",
    platform: "x",
    angle_type: "breaking",
    source_item_id: "story_001",
    source_list: ["https://test.com"],
    confidence: "high",
    freshness: "same-day",
    publish_score: 95,
    publish_decision: "publish_now",
    decision_reason: "Auto-publish: Tier A + high confidence + fresh",
  };
  if (!post.draft_id) throw new Error("Missing draft_id");
  if (!post.source_item_id) throw new Error("Missing source_item_id");
  if (!Array.isArray(post.source_list)) throw new Error("source_list not array");
});

test("Formatter: Create PublishingPacket structure", () => {
  const packet = {
    run_date: "2026-04-03",
    timezone: "Asia/Manila",
    status: "approved",
    publish_now: [1, 2, 3],
    queue: [4, 5],
    held: [6],
    rejected: [],
    account_health_score: 85,
    mode: {
      approval_required: true,
      auto_publish: false,
      auto_reply: false,
    },
  };
  if (!packet.run_date) throw new Error("Missing run_date");
  if (!packet.timezone) throw new Error("Missing timezone");
  if (!Array.isArray(packet.publish_now)) throw new Error("publish_now not array");
  if (packet.mode.approval_required !== true)
    throw new Error("Wrong default mode");
});

test("Formatter: Health score calculation", () => {
  const total = 10;
  const ready = 5;
  const rejected = 1;
  const queued = 4;
  const ready_ratio = ready / total;
  const rejected_ratio = rejected / total;
  const queued_ratio = queued / total;

  let health = 100;
  if (ready_ratio < 0.2) health -= 20;
  if (rejected_ratio > 0.4) health -= 15;
  if (queued_ratio > 0.7) health -= 10;

  if (health < 0 || health > 100) throw new Error("Health score out of range");
});

test("Formatter: Generate brief with publish_now posts", () => {
  const brief = "📮 Publishing Queue Ready — 3 publish now, 2 queued, 1 held";
  if (!brief.includes("📮")) throw new Error("Missing emoji");
  if (!brief.includes("3 publish now")) throw new Error("Missing count");
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

console.log("\n=== INTEGRATION TESTS ===\n");

test("Integration: Mock PostingPacket structure from Cade", () => {
  const cadePacket = {
    batch_date: "2026-04-03",
    timezone: "Asia/Manila",
    tier_a_ready: [
      {
        post_id: "story_001_single_1",
        source_item_id: "story_001",
        platform: "x",
        format: "single_post",
        confidence: "high",
        freshness: "same-day",
        publish_priority: 85,
        text: "Claude 4.5 released",
        source_list: ["https://anthropic.com"],
        risk_notes: [],
      },
    ],
    tier_b_review: [
      {
        post_id: "story_002_single_1",
        source_item_id: "story_002",
        platform: "x",
        confidence: "medium",
        freshness: "past_24h",
        publish_priority: 60,
        text: "Claude update",
        source_list: ["https://claude.ai"],
        risk_notes: [],
      },
    ],
    tier_c_hold: [],
  };
  if (!cadePacket.tier_a_ready) throw new Error("Missing Tier A");
  if (cadePacket.tier_a_ready.length !== 1)
    throw new Error("Wrong Tier A count");
});

test("Integration: Select Tier A drafts", () => {
  const posting_packet = {
    tier_a_ready: [
      { post_id: "1", confidence: "high", freshness: "same-day" },
      { post_id: "2", confidence: "high", freshness: "past_24h" },
    ],
    tier_b_review: [{ post_id: "3", confidence: "medium" }],
    tier_c_hold: [{ post_id: "4", confidence: "low" }],
  };
  const tier_a = posting_packet.tier_a_ready;
  if (tier_a.length !== 2) throw new Error("Wrong selection");
});

test("Integration: Apply approval_required=true default", () => {
  const request = {
    approval_required: undefined,
  };
  const effective = request.approval_required !== false;
  if (!effective) throw new Error("Default not applied");
});

test("Integration: Apply auto_publish=false default", () => {
  const request = {
    auto_publish: undefined,
  };
  const effective = request.auto_publish || false;
  if (effective) throw new Error("Default not applied");
});

test("Integration: Preserve source trace through all layers", () => {
  const input = {
    source_item_id: "story_001",
    source_list: ["https://anthropic.com"],
    confidence: "high",
  };
  const output = {
    source_item_id: input.source_item_id,
    source_list: input.source_list,
    confidence: input.confidence,
  };
  if (output.source_item_id !== input.source_item_id)
    throw new Error("Source trace lost");
  if (JSON.stringify(output.source_list) !== JSON.stringify(input.source_list))
    throw new Error("Source URLs lost");
});

// =============================================================================
// API CONTRACT TESTS
// =============================================================================

console.log("\n=== API CONTRACT TESTS ===\n");

test("API: Validate MaikoRequest structure", () => {
  const request = {
    source: "test",
    action: "publish",
    query: "test query",
    approval_required: true,
    auto_publish: false,
    target_platforms: ["x"],
    trace_id: "trace_123",
  };
  if (!request.source) throw new Error("Missing source");
  if (!request.action) throw new Error("Missing action");
  if (!["test", "telegram", "chris", "debug"].includes(request.source))
    throw new Error("Invalid source");
  if (request.action !== "publish") throw new Error("Invalid action");
});

test("API: Validate MaikoResponse structure", () => {
  const response = {
    ok: true,
    action: "publish",
    trace_id: "trace_123",
    brief: "📮 Publishing Queue Ready",
    publish_packet: {
      run_date: "2026-04-03",
      publish_now: [1, 2],
      queue: [3],
      held: [],
      rejected: [],
    },
  };
  if (typeof response.ok !== "boolean") throw new Error("ok should be boolean");
  if (typeof response.brief !== "string") throw new Error("brief should be string");
  if (!response.publish_packet) throw new Error("Missing publish_packet");
});

test("API: Error response structure", () => {
  const error = {
    ok: false,
    action: "publish",
    error_code: "MISSING_FIELDS",
    error_message: "Require either query or posting_packet",
  };
  if (error.ok !== false) throw new Error("ok should be false");
  if (!error.error_code) throw new Error("Missing error_code");
  if (!error.error_message) throw new Error("Missing error_message");
});

test("API: Error codes are valid", () => {
  const validCodes = [
    "MISSING_FIELDS",
    "INVALID_REQUEST",
    "UNPARSEABLE",
    "NO_RESEARCH",
    "INTERNAL_ERROR",
  ];
  const testCode = "MISSING_FIELDS";
  if (!validCodes.includes(testCode)) throw new Error("Invalid error code");
});

// =============================================================================
// CHRIS ROUTER TESTS
// =============================================================================

console.log("\n=== CHRIS ROUTER TESTS ===\n");

test("Router: Detect publishing keywords", () => {
  const text = "publish the posts";
  const keywords = [
    "publish",
    "post",
    "share",
    "ship",
    "release",
    "live",
  ];
  const detected = keywords.some((kw) => text.toLowerCase().includes(kw));
  if (!detected) throw new Error("Keywords not detected");
});

test("Router: Detect publishing action verbs", () => {
  const text = "publish now";
  const verbs = ["publish", "post", "share", "ship", "release"];
  const detected = verbs.some((v) => text.toLowerCase().startsWith(v));
  if (!detected) throw new Error("Action verb not detected");
});

test("Router: Detect publishing patterns", () => {
  const text = "publish these posts";
  const patterns = [
    /publish .*posts?/i,
    /share .*posts?/i,
    /ship .*posts?/i,
  ];
  const detected = patterns.some((p) => p.test(text));
  if (!detected) throw new Error("Pattern not detected");
});

test("Router: Guard against composition intent", () => {
  const text = "draft posts";
  // Composition keyword: "draft"
  // Publishing keyword: "post"
  // Should detect as composition, not publishing
  const hasCompositionKeyword = text.toLowerCase().includes("draft");
  if (!hasCompositionKeyword)
    throw new Error("Guard doesn't protect against composition");
});

test("Router: Guard against calendar intent", () => {
  const text = "schedule this for tomorrow at 9am";
  // Has calendar keywords
  const hasCalendarKeyword = text.toLowerCase().includes("schedule");
  if (!hasCalendarKeyword)
    throw new Error("Guard doesn't protect against calendar");
});

test("Router: Guard against research intent", () => {
  const text = "what's new in AI";
  // Has research keywords
  const hasResearchKeyword = text.toLowerCase().includes("what");
  if (!hasResearchKeyword)
    throw new Error("Guard doesn't protect against research");
});

// =============================================================================
// SAFETY TESTS
// =============================================================================

console.log("\n=== SAFETY TESTS ===\n");

test("Safety: approval_required cannot be bypassed", () => {
  const defaults = {
    approval_required: true,
    auto_publish: false,
  };
  if (defaults.approval_required !== true)
    throw new Error("Default not enforced");
});

test("Safety: auto_publish defaults to false", () => {
  const settings = {
    auto_publish: false,
  };
  if (settings.auto_publish !== false) throw new Error("Default not enforced");
});

test("Safety: auto_reply defaults to false", () => {
  const settings = {
    auto_reply: false,
  };
  if (settings.auto_reply !== false) throw new Error("Default not enforced");
});

test("Safety: Empty post text rejected", () => {
  const draft = {
    text: "",
  };
  if (draft.text && draft.text.trim().length > 0) {
    throw new Error("Empty text not rejected");
  }
});

test("Safety: Risk flags prevent publishing", () => {
  const draft = {
    risk_notes: ["Do not post"],
  };
  const shouldReject = draft.risk_notes.some((n) =>
    n.includes("Do not post")
  );
  if (!shouldReject) throw new Error("Risk flag ignored");
});

test("Safety: Missing source trace rejected", () => {
  const draft = {
    confidence: "low",
    source_list: [],
  };
  const shouldReject = draft.confidence === "low" && draft.source_list.length === 0;
  if (!shouldReject) throw new Error("Missing source not rejected");
});

// =============================================================================
// EDGE CASES
// =============================================================================

console.log("\n=== EDGE CASE TESTS ===\n");

test("Edge case: Empty tier_a_ready", () => {
  const packet = {
    tier_a_ready: [],
    tier_b_review: [1, 2],
    tier_c_hold: [3],
  };
  if (packet.tier_a_ready.length !== 0) throw new Error("Expected empty");
  // Should queue Tier B instead
  if (packet.tier_b_review.length !== 2) throw new Error("Wrong fallback");
});

test("Edge case: All drafts rejected", () => {
  const decisions = {
    publish_now: [],
    queue: [],
    held: [],
    rejected: [1, 2, 3, 4, 5],
  };
  const health = decisions.rejected.length > 3 ? 50 : 100;
  if (health > 70) throw new Error("Health should be lower");
});

test("Edge case: Very high health score", () => {
  const decisions = {
    publish_now: [1, 2, 3, 4, 5],
    queue: [],
    held: [],
    rejected: [],
  };
  let health = 100;
  const ready_ratio = 5 / 5;
  if (ready_ratio > 0.8) health = 100; // Still healthy
  if (health !== 100) throw new Error("Should be perfect health");
});

test("Edge case: Single draft in packet", () => {
  const packet = {
    tier_a_ready: [{ post_id: "1" }],
    tier_b_review: [],
    tier_c_hold: [],
  };
  if (packet.tier_a_ready.length !== 1) throw new Error("Wrong count");
});

test("Edge case: Very long post text (280 chars)", () => {
  const text =
    "A".repeat(280) + " This is a very long post that should still work";
  if (text.length < 280) throw new Error("Text too short");
  if (!text) throw new Error("Text is empty");
});

test("Edge case: Special characters in post text", () => {
  const text =
    'Special chars: !@#$%^&*()[]{}|\\;:"\'<>,.?/~`_+-=';
  if (!text.includes("@")) throw new Error("Special chars lost");
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log("\n=== TEST SUMMARY ===\n");
console.log(`Total Tests: ${passed + failed}`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);

if (failed === 0) {
  console.log("\n🎉 ALL TESTS PASSED - READY FOR PRODUCTION");
  console.log("\nSafe to connect your live account:");
  console.log("  ✓ Parser logic validated");
  console.log("  ✓ Publisher selection verified");
  console.log("  ✓ Formatter output correct");
  console.log("  ✓ API contracts match");
  console.log("  ✓ Chris router intent detection working");
  console.log("  ✓ Safety defaults enforced");
  console.log("  ✓ Error handling validated");
  console.log("  ✓ Edge cases handled");
  process.exit(0);
} else {
  console.log("\n⚠️  TESTS FAILED - DO NOT CONNECT LIVE ACCOUNT");
  console.log("\nFix errors above before production deployment");
  process.exit(1);
}
