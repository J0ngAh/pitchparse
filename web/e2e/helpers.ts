import { type Page } from "@playwright/test";

export const SAMPLE_TRANSCRIPT = `# Sales Call Transcript

**Date:** 2026-03-10
**Consultant:** Sarah Chen
**Prospect:** Michael Torres, VP of Sales at TechCorp

---

## Opening (0:00 - 2:00)

**Sarah:** Good morning Michael, thank you for taking the time to speak with me today. I know you mentioned on our initial call that you're looking to improve your team's call quality. Can you tell me a bit more about what prompted that?

**Michael:** Sure, thanks for reaching out Sarah. We've been scaling our sales team pretty rapidly — went from 10 to 30 reps in the last six months. The problem is, our conversion rates have actually dropped as we've grown. I think call quality is a big part of that.

## Discovery (2:00 - 8:00)

**Sarah:** That's a common challenge with rapid scaling. When you say conversion rates have dropped, can you quantify that for me? What were you seeing before versus now?

**Michael:** We were converting about 35% of qualified demos to closed-won. Now we're hovering around 22%. That's a significant drop.

**Sarah:** That is significant. And what's your average deal size?

**Michael:** Around $45,000 ARR for our mid-market segment.

**Sarah:** So if I'm doing the math right, with 30 reps each doing roughly 4 demos a week, that drop from 35% to 22% represents roughly... $2.8 million in lost annual revenue?

**Michael:** When you put it that way, it's pretty alarming. We hadn't calculated the actual revenue impact.

## Presentation (8:00 - 15:00)

**Sarah:** This is exactly the kind of problem Pitch|Parse was designed to solve. Let me show you how it works. We analyze every sales call using AI to score performance across 10 key indicators — things like discovery depth, objection handling, and closing technique.

**Michael:** How is that different from just listening to call recordings?

**Sarah:** Great question. The difference is scale and consistency. A manager might review 3-4 calls a week per rep. Pitch|Parse analyzes every single call and provides specific, actionable coaching recommendations. Plus, the scoring is consistent — no bias, no bad days affecting the review.

## BANT Qualification (15:00 - 20:00)

**Sarah:** Michael, to make sure I'm recommending the right package — you mentioned 30 reps. What's your budget range for a solution like this?

**Michael:** We've allocated about $50,000 for sales enablement tools this quarter.

**Sarah:** And in terms of timeline, when are you looking to have something in place?

**Michael:** Ideally within the next 30 days. We have a board meeting in Q2 and I want to show improvement.

**Sarah:** Who else would be involved in this decision?

**Michael:** My CRO, Jennifer Walsh, would need to sign off. But she's already aware we're evaluating tools.

## Closing (20:00 - 25:00)

**Sarah:** Based on everything you've shared, I'd recommend our Team plan. It covers all 30 reps, includes custom KPI configuration so we can align scoring with your specific sales methodology, and gives you the manager dashboard to track improvement over time.

**Michael:** What would the investment look like?

**Sarah:** The Team plan is $249 per month. Given the $2.8 million revenue gap we identified, the ROI would be substantial even with a modest improvement in conversion rates.

**Michael:** That's very reasonable. Can you send me a proposal I can share with Jennifer?

**Sarah:** Absolutely. I'll have that over to you by end of day. If Jennifer has any questions, I'm happy to set up a brief call with her as well. Would Thursday work for a follow-up to discuss next steps?

**Michael:** Thursday at 2pm works for me. Let me check with Jennifer and I'll confirm.

**Sarah:** Perfect. I'll send the calendar invite. Thank you for your time today, Michael.

**Michael:** Thank you, Sarah. This looks promising.
`;

/**
 * Navigate to dashboard, waiting for it to load.
 */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/**
 * Upload a transcript file on the Analyze page.
 * Assumes we're already on /analyze.
 */
export async function uploadTranscript(
  page: Page,
  content: string = SAMPLE_TRANSCRIPT
): Promise<void> {
  // Switch to Upload tab if not already there
  await page.getByRole("tab", { name: "Upload File" }).click();

  // Create a buffer and upload via the file input
  const buffer = Buffer.from(content);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: `e2e-transcript-${Date.now()}.md`,
    mimeType: "text/markdown",
    buffer,
  });

  // Wait for upload success
  await expect(page.getByText("Transcript uploaded!")).toBeVisible({
    timeout: 10_000,
  });
}

// Re-export expect for use in helper functions
import { expect } from "@playwright/test";
