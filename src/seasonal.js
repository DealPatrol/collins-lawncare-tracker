// ── Seasonal upsell reminders ────────────────────────────────────
// Existing customers are the cheapest revenue there is — no lead cost, no
// new-customer trust to build. This surfaces the right seasonal add-on to
// pitch each month and writes the message, so growing revenue per customer
// takes one tap instead of remembering the lawn-care calendar yourself.

// `months` are 0-indexed (Jan = 0), matching Date#getMonth().
export const SEASONAL_CAMPAIGNS = [
  {
    id: "spring-cleanup",
    label: "Spring Cleanup",
    months: [1, 2],
    pitch: "a spring cleanup — beds cleared, dead growth pulled, and the yard reset for the season",
  },
  {
    id: "mulch-refresh",
    label: "Mulch Refresh",
    months: [2, 3],
    pitch: "a fresh layer of mulch — it's the fastest curb-appeal upgrade there is",
  },
  {
    id: "fertilization",
    label: "Fertilization Treatment",
    months: [2, 3, 4, 7, 8],
    pitch: "a seasonal fertilization treatment to thicken things up and green the lawn",
  },
  {
    id: "aeration-overseed",
    label: "Aeration & Overseeding",
    months: [7, 8],
    pitch: "aeration and overseeding — the best window all year to thicken the lawn before it goes dormant",
  },
  {
    id: "fall-cleanup",
    label: "Fall Cleanup",
    months: [8, 9, 10],
    pitch: "leaf removal and a fall cleanup before the holidays",
  },
  {
    id: "holiday-lighting",
    label: "Holiday Lighting",
    months: [10, 11],
    pitch: "holiday lighting install — steady income in your slow season, and your existing customers already trust you on the ladder",
  },
];

export function activeCampaigns(date = new Date()) {
  const month = date.getMonth();
  return SEASONAL_CAMPAIGNS.filter((c) => c.months.includes(month));
}

function firstName(name) {
  return (name || "").trim().split(/\s+/)[0] || "";
}

export function buildUpsellSms(campaign, { customerName, senderName, bizPhone } = {}) {
  const greeting = customerName ? `Hi ${firstName(customerName)}` : "Hi";
  const reply = bizPhone ? ` or call/text ${bizPhone}` : "";
  return (
    `${greeting}, ${firstName(senderName) || "the crew"} with Collins Lawncare here — this time of year we're booking ` +
    `${campaign.pitch}. Want us to add it to your next visit? Just reply${reply}. Thanks!`
  );
}

export function buildUpsellLetter(campaign, { customerName, address, senderName, bizPhone } = {}) {
  const dear = customerName ? `Hi ${customerName},` : "Hi,";
  const phone = bizPhone ? `call or text me at ${bizPhone}` : "let me know next time we're out";
  return (
    `${dear}\n\n` +
    `This time of year we're booking ${campaign.pitch} for our regular customers${address ? ` in your area` : ""}. ` +
    `Since we're already taking care of your yard, adding it on is easy and priced fair.\n\n` +
    `Want it added to your next visit? Just ${phone}.\n\n` +
    `${senderName || "The crew"}\n` +
    `Collins Lawncare`
  );
}
