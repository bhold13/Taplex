import styles from "./TapLexConnectPreview.module.css";

const matches = [
  {
    name: "Maya Cole",
    role: "Photographer",
    score: 92,
    reasons: ["Offers a service you need", "Music industry", "Strong community reviews"]
  },
  {
    name: "Jordan Lee",
    role: "Producer",
    score: 87,
    reasons: ["Complementary profession", "Shared launch goals", "Recent activity"]
  },
  {
    name: "Sam Rivera",
    role: "Venue Owner",
    score: 81,
    reasons: ["Useful local opportunity", "Mutual connections", "Event alignment"]
  }
];

export default function TapLexConnectPreview() {
  return (
    <section className={styles.matches} aria-label="TapLex Connect matches">
      {matches.map((match) => (
        <article className={styles.match} key={match.name}>
          <div>
            <h2>{match.name}</h2>
            <p>{match.role}</p>
          </div>
          <strong>{match.score}</strong>
          <ul>
            {match.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
