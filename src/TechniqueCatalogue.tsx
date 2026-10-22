import { useState } from "react";
import type { RefObject } from "react";
import type { AppModel } from "./app-model";
import Icon from "./Icon";
import { closeOnEscape } from "./dialog";

/** The technique index dialog, filtered by search text and collection. */
export default function TechniqueCatalogue({
  model,
  dialog,
}: {
  model: AppModel;
  dialog: RefObject<HTMLDialogElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const choices = model.techniques.filter(
    (t) =>
      (family === "all" || t.family === family) &&
      `${t.name} ${t.family} ${t.nature.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const families = [...new Set(model.techniques.map((t) => t.family))].sort();
  return (
    <dialog
      onKeyDown={closeOnEscape}
      className="lab-dialog"
      ref={dialog}
      aria-labelledby="catalogue-title"
    >
      <header className="dialog-header">
        <span>
          <b lang="ja">術式目録</b> REFERENCE LIBRARY
        </span>
        <i className="hazard" aria-hidden="true" />
        <button
          aria-label="Close technique catalogue"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="dialog-content">
        <h2 id="catalogue-title">
          Technique index<span>{model.techniques.length} entries</span>
        </h2>
        <div className="library-filters">
          <label className="search-label">
            <span>Search techniques, clans, or nature</span>
            <input
              type="search"
              placeholder="e.g. Fire, Uchiha, Shadow…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </label>
          <label>
            <span>Collection</span>
            <select value={family} onChange={(e) => setFamily(e.target.value)}>
              <option value="all">All collections</option>
              {families.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="results-count" aria-live="polite">
          {choices.length} matching {choices.length === 1 ? "entry" : "entries"}
        </p>
        <div className="technique-list">
          {choices.map((t) => (
            <button
              className={`technique-item ${t.id === model.selected.id ? "selected" : ""}`}
              key={t.id}
              onClick={() => {
                model.selectTechnique(t.id);
                dialog.current?.close();
              }}
              aria-pressed={t.id === model.selected.id}
            >
              <span>
                <strong>{t.name.replace(/[—–]/g, "-")}</strong>
                <small>
                  {t.family}
                  {t.nature.length ? ` / ${t.nature.join(" + ")}` : ""}
                </small>
              </span>
              <Icon name={t.id === model.selected.id ? "selected" : "arrow"} />
            </button>
          ))}
          {!choices.length && (
            <p>No matching techniques. Try a different search.</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
