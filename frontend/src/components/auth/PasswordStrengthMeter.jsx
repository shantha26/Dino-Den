// Simple, dependency-free heuristic: length + character-class variety.
// Good enough to nudge people toward stronger passwords without pretending
// to be a real entropy estimator.
export function scorePassword(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

const LEVELS = [
  { label: "Too short", color: "bg-ink/15" },
  { label: "Weak", color: "bg-lava" },
  { label: "Fair", color: "bg-amber" },
  { label: "Good", color: "bg-amber" },
  { label: "Strong", color: "bg-fern" },
  { label: "Very strong", color: "bg-fern" },
];

export default function PasswordStrengthMeter({ password }) {
  const score = scorePassword(password);
  const level = LEVELS[score];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < score ? level.color : "bg-ink/10"
            }`}
          />
        ))}
      </div>
      {password && (
        <p className={`text-[11px] font-extrabold ${score <= 1 ? "text-lava" : "text-ink/50"}`}>
          {level.label}
        </p>
      )}
    </div>
  );
}
