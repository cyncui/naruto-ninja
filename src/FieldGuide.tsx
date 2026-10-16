import { site } from "./data/site";
import "./view.css";
import "./guide.css";

const chapterJp = ["印契演習", "個人調整", "資料解析"];

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
            <small>HAND SEAL LABORATORY · EXPERIMENTAL</small>
          </div>
        </a>
        <span className="hazard guide-hazard" aria-hidden="true" />
        <nav aria-label="Main navigation">
          <a href="/">Training room</a>
          <a href="/guide" aria-current={missing ? undefined : "page"}>
            Field guide
          </a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <div className={`guide-hero ${missing ? "guide-missing" : ""}`}>
          <div>
            <p className="guide-kicker">
              {missing
                ? "ERROR 404 / PATTERN UNKNOWN"
                : "SECTION 00 / FIELD GUIDE"}
            </p>
            <p className="guide-kanji" lang="ja">
              {missing ? "信号途絶" : "忍術訓練手引書"}
            </p>
            <h1>
              {missing ? (
                <>
                  Scroll <span>signal lost.</span>
                </>
              ) : (
                <>
                  Shinobi <span>training manual.</span>
                </>
              )}
            </h1>
          </div>
          <div className="guide-brief">
            <span className="guide-brief-tag">
              {missing ? (
                <>
                  <b lang="ja">警告</b> WARNING
                </>
              ) : (
                <>
                  <b lang="ja">概要</b> BRIEFING
                </>
              )}
            </span>
            <p>
              {missing
                ? "There’s no technique at this address. Head back to the training room and pick up where your hands left off."
                : "A browser, your hands, and a little patience. Here’s how to get started, and what this experimental playground can actually do."}
            </p>
          </div>
        </div>
        {!missing && (
          <div className="guide-chapters">
            {site.guide.map((chapter, index) => (
              <section className="guide-chapter" key={chapter.title}>
                <span className="chapter-number" aria-hidden="true">
                  <small>SECTION</small>0{index + 1}
                </span>
                <div className="chapter-title">
                  <span lang="ja">{chapterJp[index]}</span>
                  <h2>{chapter.title}</h2>
                </div>
                <div>
                  <p>{chapter.body}</p>
                  <p className="chapter-note">
                    <b>
                      <span lang="ja">注意</span> NOTE
                    </b>
                    {chapter.note}
                  </p>
                </div>
              </section>
            ))}
            <section className="privacy-chapter">
              <span className="hazard" aria-hidden="true" />
              <div>
                <p className="privacy-tag">
                  <b lang="ja">内部</b> INTERNAL · LOCAL PROCESSING
                </p>
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
            {missing ? "Return to practice" : "Enter the training room"}
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
