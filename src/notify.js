// ── Customer "job done" notifications ───────────────────────────
// The app has no backend of its own, so it can't send a text message
// directly — browsers don't allow a page to silently send SMS to someone
// else's phone (sms:/mailto: links only ever compose FROM the crew's own
// device and need a manual tap). A webhook is the honest zero-backend way
// to make it actually automatic: point it at a Zapier "Catch Hook" (or
// similar) that forwards to Twilio/SMS by Zapier, and this fires the moment
// a job's timer stops — no tap required.

export function buildCompletionMessage(template, { customer, job, crew }) {
  return (template || "")
    .replaceAll("{customer}", customer || "there")
    .replaceAll("{job}", job || "your yard")
    .replaceAll("{crew}", crew || "the crew");
}

// Fire-and-forget: a bad/unreachable webhook should never block the crew
// from stopping a timer, so failures are swallowed rather than surfaced.
export function sendCompletionWebhook(url, payload) {
  if (!url) return;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
