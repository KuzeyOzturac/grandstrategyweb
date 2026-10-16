/// <reference lib="webworker" />
import {
  createState,
  command,
  tick,
  serialize,
  deserialize,
  type State,
} from "./engine";
import type { MapData } from "./scenario";
let state: State | null = null,
  map: MapData,
  speed = 0,
  timer: ReturnType<typeof setTimeout> | undefined;
const send = (extra = {}) => postMessage({ state, speed, ...extra });
function schedule() {
  clearTimeout(timer);
  if (speed && state && (!state.defeated || state.observer)) {
    timer = setTimeout(() => {
      try {
        const beforeDecision = state!.society?.[state!.player]?.decision?.id;
        const beforePlays = state!.crises
          .filter(
            (cr) => cr.status === "negotiating" && cr.to === state!.player,
          )
          .map((cr) => cr.id);
        tick(state!, map);
        const afterDecision = state!.society?.[state!.player]?.decision?.id;
        if (
          (afterDecision !== undefined && afterDecision !== beforeDecision) ||
          state!.crises.some(
            (cr) =>
              cr.status === "negotiating" &&
              cr.to === state!.player &&
              !beforePlays.includes(cr.id),
          )
        )
          speed = 0;
        send({
          autosave: state!.day % 10 === 0 ? serialize(state!) : undefined,
        });
        schedule();
      } catch (e) {
        speed = 0;
        send({ error: String(e) });
      }
    }, [0, 2000, 700, 200][speed]);
  }
}
onmessage = ({ data: d }) => {
  try {
    if (d.type === "init") {
      map = d.map;
      state = createState(map, d.player, d.guided, d.seed ?? 2012);
      speed = 0;
      clearTimeout(timer);
      send();
    } else if (d.type === "load") {
      const candidate = deserialize(d.text, map);
      state = candidate;
      speed = 0;
      clearTimeout(timer);
      send({ result: { ok: true, message: "Campaign loaded." } });
    } else if (d.type === "speed") {
      speed = Math.max(0, Math.min(3, Math.floor(d.speed)));
      schedule();
      send();
    } else if (d.type === "command" && state) {
      const result = command(state, map, d.command);
      send({ result });
    } else if (d.type === "save" && state)
      postMessage({ save: serialize(state), export: d.export });
    else if (d.type === "step" && state) {
      tick(state, map, 1);
      send();
    }
  } catch (e) {
    postMessage({ error: e instanceof Error ? e.message : String(e) });
  }
};
