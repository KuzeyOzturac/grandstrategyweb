import { useState } from "react";
import { LAWS, LAW_GROUPS, currentLaw, lawChances, lawEffects } from "./laws";
import { society, capacity, GROUPS, lawSupport } from "./society";
import type { State, Command } from "./engine";
export function LawPanel({
  s,
  send,
}: {
  s: State;
  send: (c: Command) => void;
}) {
  const [category, setCategory] = useState("Power structure"),
    [selected, setSelected] = useState("governance");
  const n = society(s),
    c = s.countries[s.player],
    e = n.enacting,
    effects = lawEffects(n);
  const groups = Object.entries(LAW_GROUPS).filter(
    ([, g]) => g.category === category,
  );
  const group = groups.find(([id]) => id === selected)?.[0] ?? groups[0][0];
  const present = currentLaw(n, group);
  return (
    <div className="section law-codex">
      <span className="eyebrow">National legislation</span>
      <h3>Laws & institutions</h3>
      <p>
        One law per policy area. Replacing a law changes its effects and the
        balance of political support.
      </p>
      <div className="law-totals">
        <span>{capacity(n).toFixed(0)} bureaucracy available</span>
        <span>{effects.cost.toFixed(2)} credits/day institutions</span>
        <span>
          {effects.output > 0 ? "+" : ""}
          {effects.output}% production
        </span>
      </div>
      {e && (
        <div className="law-progress" aria-label="Active reform">
          <b>Reforming: {LAWS[e.law].name}</b>
          <p>
            {["Drafting", "Committee review", "Ratification"][e.stage ?? 0]} ·{" "}
            {e.setbacks ?? 0}/3 setbacks
          </p>
          <progress max={12} value={e.progress} />
          <p>
            {c.legitimacy < 25
              ? "Paused: legitimacy below 25"
              : `${Math.ceil((12 - e.progress) / Math.max(0.25, c.legitimacy / 75))} days to next checkpoint`}{" "}
            · {e.outcome ?? "Debate underway"}
          </p>
          <p className="hint">
            Three approved stages enact the law; three setbacks defeat it.
            Abandoning or failing creates a 60-day policy cooldown.
          </p>
          <button onClick={() => send({ type: "cancel_law" })}>
            Abandon reform
          </button>
        </div>
      )}
      <div className="law-categories" role="group" aria-label="Law categories">
        {["Power structure", "Economy", "Human rights"].map((cat) => (
          <button
            key={cat}
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <label className="field">
        Policy area
        <select
          aria-label="Policy area"
          value={group}
          onChange={(ev) => setSelected(ev.target.value)}
        >
          {groups.map(([id, g]) => (
            <option key={id} value={id}>
              {g.name} — {LAWS[currentLaw(n, id)].name}
            </option>
          ))}
        </select>
      </label>
      <h4>{LAW_GROUPS[group].name}</h4>
      {LAW_GROUPS[group].choices.map((law) => {
        const def = LAWS[law],
          active = law === present,
          chances = lawChances(n, law);
        const cooldown = Math.max(0, (n.lawCooldowns?.[group] ?? 0) - s.day);
        const why = e
          ? "Finish the current reform first"
          : cooldown
            ? `${cooldown} days of policy cooldown`
            : c.legitimacy < 25
              ? "Requires 25 legitimacy"
              : lawSupport(n, law) < 35
                ? "Requires 35 political support"
                : capacity(n) < 15
                  ? "Requires 15 available bureaucracy"
                  : c.treasury < 15
                    ? "Requires 15 credits"
                    : null;
        return (
          <article className={`law-row ${active ? "enacted" : ""}`} key={law}>
            <div className="law-title">
              <h4>{def.name}</h4>
              {active && <span className="law-badge">In force</span>}
            </div>
            <p>{def.description}</p>
            {!active && (
              <>
                <p>Replaces {LAWS[present].name}</p>
                <div className="law-odds">
                  <span>{chances.advance}% advance</span>
                  <span>{chances.debate}% debate</span>
                  <span>{chances.stall}% setback</span>
                </div>
                <p className="hint">
                  Compared with current law: {chances.support.toFixed(0)}% clout
                  supports; {chances.opposition.toFixed(0)}% opposes.
                </p>
                <p className="hint">
                  Support:{" "}
                  {Object.entries(GROUPS)
                    .filter(
                      ([g]) =>
                        def.support[g as keyof typeof GROUPS] >
                        LAWS[present].support[g as keyof typeof GROUPS],
                    )
                    .map(([, name]) => name)
                    .join(", ") || "No interest group"}
                </p>
                <button
                  disabled={!!why}
                  title={why ?? undefined}
                  onClick={() => send({ type: "enact", law })}
                >
                  Begin reform · 15 credits
                </button>
                {why && <small className="hint">{why}</small>}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
