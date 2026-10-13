import { site } from "./data/site";
import "./view.css";
import "./guide.css";

export default function FieldGuide({ missing = false }: { missing?: boolean }) {
  return (
    <div className="guide-page">
      <header className="guide-header">
        <a href="/" className="brand">
          <span className="brand-seal" aria-hidden="true">
            忍
          </span>
          <div>
            <strong>
              NARUTO<span>/</span>NINJA
            </strong>
            <small>HAND SEAL LABORATORY</small>
          </div>
        </a>
        <nav aria-label="Main navigation">
          <a href="/">Training room</a>
          <a href="/guide" aria-current={missing ? undefined : "page"}>
            Field guide
          </a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="guide-hero">
          <div>
            <p className="guide-kicker">
              {missing ? "404 / Missing scroll" : "Your training companion"}
            </p>
            <h1>
              {missing ? (
                <>
                  This scroll
                  <br />
                  went missing.
                </>
              ) : (
                <>
                  A little training.
                  <br />
                  <span>A lot of hand signs.</span>
                </>
              )}
            </h1>
          </div>
          <p>
            {missing
              ? "There’s no technique at this address. Head back to the training room and pick up where your hands left off."
              : "A browser, your hands, and a little patience. Here’s how to get started, and what this experimental playground can actually do."}
          </p>
        </div>
        {!missing && (
          <div className="guide-chapters">
            {site.guide.map((chapter, index) => (
              <section className="guide-chapter" key={chapter.title}>
                <span className="chapter-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <h2>{chapter.title}</h2>
                <div>
                  <p>{chapter.body}</p>
                  <p className="chapter-note">{chapter.note}</p>
                </div>
              </section>
            ))}
            <section className="privacy-chapter">
              <div>
                <h2>Your camera. Your device.</h2>
                <p>
                  Camera frames and photos are never stored or uploaded.
                  Tracking runs locally. Calibration saves normalized landmark
                  vectors in this browser; Clear saved examples removes them.
                  Your panel layout also stays in this browser.
                </p>
              </div>
            </section>
          </div>
        )}
        <footer className="guide-footer">
          <a className="guide-cta" href="/">
            {missing ? "Return to practice" : "Make your next move"}
            <span aria-hidden="true">↗</span>
          </a>
          <p>
            Fan-made, experimental, and here for practice.
            <br />
            No account. No camera required for Demo.
          </p>
        </footer>
      </main>
    </div>
  );
}
