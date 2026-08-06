import styles from "./MetricGrid.module.css";

export default function MetricGrid({ metrics }) {
  return (
    <section className={styles.metrics} aria-label="Metrics">
      {metrics.map((metric) => (
        <article className={styles.metric} key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </section>
  );
}
