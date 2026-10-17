import Icon from "./Icon";
import type { PoseCheck } from "./pose/feedback";

/**
 * Reticle caption while the camera is live: what to fix in the current pose,
 * most important first, then the seal's written how-to.
 */
export default function Corrections({
  check,
  title,
  how,
}: {
  check: PoseCheck | null;
  title: string;
  how: string;
}) {
  return (
    <>
      <b className="caption-title">{title}</b>
      {check && (
        <ul className={`corrections ${check.state}`}>
          {check.state === "ok" ? (
            <li className="ok">
              <Icon name="check" /> Pose matches the reference
            </li>
          ) : (
            check.issues.slice(0, 3).map((issue) => (
              <li key={issue.key}>
                <i aria-hidden="true" />
                {issue.text}
              </li>
            ))
          )}
        </ul>
      )}
      <span className="caption-how">{how}</span>
    </>
  );
}
