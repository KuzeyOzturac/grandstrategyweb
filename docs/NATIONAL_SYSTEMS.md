# National-management systems

Read with REDESIGN.md; original combat details remain in SYSTEMS.md.

## Market and households

Four goods: food, energy, consumer goods, military supplies. Reference prices 20/25/30/40. Country-specific baseline supply/demand scales to controlled population indices; damage reduces production. Iran begins with an energy surplus, Türkiye with an energy shortage. These are balanced scenario assumptions, not verified inventories.
Price = reference * clamp(demand / max(1,supply), 0.5, 1.75). Completed facilities add supply. Household basket is mean normalized food/consumer/energy price. Living-standard target depends on basket, employment, taxes, healthcare and labor law; actual value moves by at most .035 per day. Living conditions and taxation change radicals, loyalists and support. Economic output is an abstract index, not real GDP. Public spending and tariff revenue affect the treasury; deficits become debt.
Trade routes cost 10 credits and reserve 6 bureaucracy. They need a shared border or two ports, peace, and no bilateral sanctions; sea-only routes suspend under pressure. Daily volume is limited by exporter surplus, importer unmet demand and capacity (12 baseline). Export surplus is reserved across routes so one supply cannot be duplicated. Free trade adds 40% capacity and halves tariff revenue; logistics adds 25% capacity. Routes with no useful surplus show zero volume. Route creation is not a promise of guaranteed trade.

## Construction and production

Six facility types: agriculture (30 credits/18d), energy (40/24d), manufacturing (35/22d), defence (40/25d), administration (25/16d), research (35/24d). One active national project, six queued maximum, full upfront cost. Prioritize freely; cancellation refunds 75% of remaining unbuilt share. Construction pauses in territory not controlled by the owner. Automation research adds 20% construction speed. Facilities add supply/jobs or administration/research capacity. Automated production adds 40% facility output and consumes extra energy.

## Politics and institutions

Four aggregate groups: business, workers, armed forces and civil society. Clout starts 30/30/25/15 and shifts with facilities and mobilization, normalized to 100. Approval reacts gradually to taxation, social laws, defence, legitimacy and living conditions. Governing groups require total clout >=50; legitimacy affects debate speed.
Reform support = favorable clout minus 20% of opposing clout. Need >=35 support, 15 available bureaucracy and 15 credits to start. One debate at a time; progress reaches 35 at a daily legitimacy-dependent rate while support remains sufficient. Healthcare/education consume bureaucracy and daily budget; labor improves living conditions with a 5% output tradeoff; open trade changes capacity/tariffs. This is a deterministic simplified debate model, not Victoria 3's law RNG. No party/election simulation is implied.
Research: automation 70 base days, logistics 55, administration 60. Institutes add 35% research rate each; education adds 40%. Logistics adds 10 to connected army supply; administration adds bureaucracy and tax yield. Earlier research is preserved in saves.

## Diplomacy and decisions

Relations missions cost 5 credits, reserve 12 influence and .08/day upkeep; change pair relations by .4/day. They can be recalled. Obligations from successful plays reserve 8 influence and add +20 acceptance when promised; repeated obligations to the same country are rejected. Initiating a war adds 12 infamy; infamy reduces acceptance and decays .03/day. Original timed agreements, backing, aid and guarantees still apply.
Plays have opening (days 0–2), bargaining (3–9), countdown (10–13), then settlement/rejection. Opening a play is deliberate; it is not a direct war button. Expiry cannot accept a proposal on behalf of a human target. AI can initiate regional access proposals, build for shortages, research and establish trade routes through the same priced commands.
A national choice appears every 30 days starting day 7: investment (20 credits, energy +15, business approval +2), household relief (20, radicals -5, living +.4), or decline (radicals +3, support -2). Approval bonuses fade gradually toward underlying conditions. Worker pauses when a new player decision or incoming proposal appears; existing unresolved choices do not repause every tick. Weekly history stores up to 52 readings.

## Strategic warfare

Player UI exposes per-enemy advance/defend/standby and national mobilization/air policy. Commander automation divides formations across active enemy fronts, finds legal routes and attacks or deploys to defend borders. Organization/supply still constrain fighting. Standby halts offensive movement. Legacy explicit unit orders remain internal for old saves and diagnostic tests, with 30-day override. No manual army counters or province-objective interface is exposed.
