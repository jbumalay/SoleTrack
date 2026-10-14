export interface ReviewReply {
  review_id: number;
  reply: string;
  seller_name?: string;
  created_at: string;
}

const REPLIES_KEY = "soletrack_review_replies";

/** Review replies are localStorage-only until the backend exposes a replies table. */
function readAll(): Record<string, ReviewReply> {
  try {
    const raw = localStorage.getItem(REPLIES_KEY) || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getReviewReply(reviewId: number): ReviewReply | null {
  return readAll()[String(reviewId)] ?? null;
}

export function saveReviewReply(reviewId: number, reply: string, sellerName?: string): ReviewReply {
  const all = readAll();
  const entry: ReviewReply = {
    review_id: reviewId,
    reply: reply.trim(),
    seller_name: sellerName,
    created_at: new Date().toISOString(),
  };
  all[String(reviewId)] = entry;
  localStorage.setItem(REPLIES_KEY, JSON.stringify(all));
  return entry;
}

export function deleteReviewReply(reviewId: number): void {
  const all = readAll();
  delete all[String(reviewId)];
  localStorage.setItem(REPLIES_KEY, JSON.stringify(all));
}
