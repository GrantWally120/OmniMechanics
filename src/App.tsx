import { useEffect, useMemo, useState } from "react";
import type { Category, Mechanism } from "./types";
import { MECHANISMS, byId } from "./data/mechanisms";
import { useMotion } from "./lib/clock";
import Masthead from "./components/Masthead";
import Controls from "./components/Controls";
import MechanismCard from "./components/MechanismCard";
import DetailView from "./components/DetailView";
import { LiveDiagram } from "./components/Diagram";

type Theme = "paper" | "workshop";

export default function App() {
  const motion = useMotion();
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("om-theme") as Theme) || "paper"
  );
  const [category, setCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Mechanism | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("om-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  const categories = useMemo(
    () => Array.from(new Set(MECHANISMS.map((m) => m.category))) as Category[],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MECHANISMS.filter((m) => {
      if (category !== "All" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        m.principle.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const featured = byId("gear-train")!;

  const openRandom = () => {
    const pool = filtered.length ? filtered : MECHANISMS;
    setSelected(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div className="app">
      <span className="crop tl" aria-hidden="true" />
      <span className="crop tr" aria-hidden="true" />
      <span className="crop bl" aria-hidden="true" />
      <span className="crop br" aria-hidden="true" />

      <div className="shell">
        <Masthead
          count={MECHANISMS.length}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "paper" ? "workshop" : "paper"))}
          running={motion.running}
          speed={motion.speed}
        />

        <section className="hero">
          <div className="hero-copy">
            <p className="hero-kicker">The workshop manual</p>
            <h2 className="hero-head">
              Everything is a bargain made physical.
            </h2>
            <p className="hero-lede">
              A gear trades speed for force. An engine trades a controlled
              explosion for a turn of the wheel. OmniMechanics takes these
              arrangements apart, sets them running, and shows the trade at the
              heart of each one — no jargon, just the moving parts.
            </p>
            <div className="hero-stats">
              <div>
                <b>{MECHANISMS.length}</b>
                <span>mechanisms</span>
              </div>
              <div>
                <b>{categories.length}</b>
                <span>disciplines</span>
              </div>
              <div>
                <b>∞</b>
                <span>cycles run</span>
              </div>
            </div>
          </div>

          <figure className="hero-plate">
            <button
              type="button"
              className="hero-plate-btn"
              onClick={() => setSelected(featured)}
              aria-label={`Open teardown: ${featured.name}`}
            >
              <LiveDiagram kind={featured.diagram} />
            </button>
            <figcaption>
              <span className="plate-label">Plate 01 — {featured.name}</span>
              <span className="plate-hint">Tap any plate to take it apart →</span>
            </figcaption>
          </figure>
        </section>

        <Controls
          running={motion.running}
          onToggleRunning={motion.toggle}
          speed={motion.speed}
          onSpeed={motion.setSpeed}
          categories={categories}
          active={category}
          onCategory={setCategory}
          query={query}
          onQuery={setQuery}
          onRandom={openRandom}
        />

        <div className="catalog-head">
          <h2>The Catalogue</h2>
          <span className="catalog-count">
            {filtered.length} / {MECHANISMS.length} shown
          </span>
        </div>

        {filtered.length ? (
          <div className="grid">
            {filtered.map((m) => (
              <MechanismCard key={m.id} m={m} onOpen={setSelected} />
            ))}
          </div>
        ) : (
          <p className="empty">No specimens match “{query}”. Try another search.</p>
        )}

        <footer className="colophon">
          <span>OmniMechanics — how things really work.</span>
          <span className="colophon-mono">
            drawn &amp; animated in the browser · {new Date().getFullYear()}
          </span>
        </footer>
      </div>

      {selected && (
        <DetailView
          m={selected}
          all={MECHANISMS}
          onClose={() => setSelected(null)}
          onNavigate={setSelected}
        />
      )}
    </div>
  );
}
