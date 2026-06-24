import { Group } from "@mantine/core";

const ACCENTS = ["#c084fc", "#f0abfc", "#6ee7b7"];

export default function StatCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: "Total commits",  value: stats.totalCommits },
    { label: "Contributors",   value: stats.contributorCount },
    { label: "Most active",    value: stats.mostActive },
  ];

  return (
    <Group mb="sm" grow>
      {cards.map(({ label, value }, i) => (
        <div
          key={label}
          className="stat-card"
          style={{
            border: `1.5px solid ${ACCENTS[i]}44`,
            boxShadow: `0 0 18px ${ACCENTS[i]}22`,
            "--accent": ACCENTS[i],
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = `0 0 32px ${ACCENTS[i]}55`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = `0 0 18px ${ACCENTS[i]}22`;
          }}
        >
          <p className="stat-card__value" style={{ color: ACCENTS[i] }}>
            {value ?? "—"}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--mantine-color-dimmed)" }}>
            {label}
          </p>
        </div>
      ))}
    </Group>
  );
}
