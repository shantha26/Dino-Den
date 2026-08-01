export const MEMBERSHIP_CONFIG = {
  New:     { color: "bg-ink/10 text-ink/60",            emoji: "🥚", desc: "First visit!" },
  Regular: { color: "bg-fern/10 text-fern",             emoji: "🦕", desc: "2–4 visits" },
  Silver:  { color: "bg-amber/10 text-amber",           emoji: "🦖", desc: "5–9 visits" },
  Gold:    { color: "bg-amber text-white",              emoji: "⭐", desc: "10–19 visits" },
  VIP:     { color: "bg-lava text-white",               emoji: "👑", desc: "20+ visits" },
};

export default function MembershipBadge({ tier }) {
  const cfg = MEMBERSHIP_CONFIG[tier] || MEMBERSHIP_CONFIG.New;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${cfg.color}`}>
      {cfg.emoji} {tier}
    </span>
  );
}
