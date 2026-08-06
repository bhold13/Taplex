import Link from "next/link";

import AdminAccessCodes from "./AdminAccessCodes";
import ClaimNFCForm from "./ClaimNFCForm";
import MetricGrid from "./MetricGrid";
import PageScaffoldStyles from "./PageScaffold.module.css";
import ProfileBuilderForm from "./ProfileBuilderForm";
import ProfileDashboard from "./ProfileDashboard";
import TapLexConnectPreview from "./TapLexConnectPreview";

export default function PageScaffold({ page }) {
  if (page.dashboard) {
    return <ProfileDashboard />;
  }

  return (
    <main className={PageScaffoldStyles.page}>
      <section className={PageScaffoldStyles.hero}>
        <div>
          <p className={PageScaffoldStyles.kicker}>{page.kicker}</p>
          <h1>{page.title}</h1>
          <p>{page.summary}</p>
          {page.actions?.length ? (
            <div className={PageScaffoldStyles.actions}>
              {page.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    action.tone === "primary"
                      ? PageScaffoldStyles.primaryAction
                      : PageScaffoldStyles.secondaryAction
                  }
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className={PageScaffoldStyles.signalPanel}>
          {page.highlights?.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      {page.metrics ? <MetricGrid metrics={page.metrics} /> : null}
      {page.builder ? <ProfileBuilderForm /> : null}
      {page.connectPreview ? <TapLexConnectPreview /> : null}
      {page.claim ? <ClaimNFCForm /> : null}
      {page.accessCodes ? <AdminAccessCodes /> : null}

      {page.panels?.length ? (
        <section className={PageScaffoldStyles.grid} aria-label={`${page.kicker} details`}>
          {page.panels.map((panel) => (
            <article className={PageScaffoldStyles.card} key={panel.title}>
              <h2>{panel.title}</h2>
              <p>{panel.text}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
