> Revision 1.2: law and diplomatic play rules below are superseded where applicable by [LAWS_DIPLOMACY.md](LAWS_DIPLOMACY.md).

# Simulation rules

## Time and state

One tick is one UTC day; 3 speeds schedule it every 5 / 2 / 0.7 seconds. Pause changes no game state. PRNG is an LCG (1664525*x+1013904223 mod 2^32), currently used to initialize province variation. Seed, day, IDs and command count are saved. Gameplay contains no unseeded chance rolls.

## Geography

Each military area has an administrative parent, owner, controller, infrastructure, damage, industry, depot, population index and terrain. All are data-driven. Adjacency comes from processed polygons. Combat changes controller, not owner. Friendly access is directional. Pathfinding is BFS over own, access-granted and (for advance orders) enemy territory. Islands have no land paths.

## Army orders and combat

An army is an aggregate formation, not a claim about a historical brigade's inventory. Strength/organization/supply are 0–100 indices. Move crosses friendly/access territory; objective can cross wartime hostile areas. Border order requires a friendly border area and attacks an adjacent enemy after deployment. Halt clears objective.
Moving consumes .22 fuel/day. Progress = (.28 hills, .42 otherwise) * (.35 + supply/100); move at progress >=1. No movement without fuel. Attack power = strength*(.25+org/100)*(.15+supply/100). Fuelled ground support multiplies it by 1.18. Hills multiply defence by 1.3, urban by 1.2. Daily combat reduces attacker organization by 3; defender organization by max(1,power/22), defender strength by max(.5,power/100). Weak defenders retreat into a legal adjacent area or disband if encircled. Attackers abandon attacks below 15 org or 18 strength. Empty hostile areas still take time to occupy. No direct civilian targeting commands.
Supply BFS starts at controlled capital and open controlled port; opposition local depots abstract distributed local support. Friendly/access paths conduct supply. Depots improve local capacity but ordinary inland depots do not create infinite supply. Supply = clamp(100-3*distance+12*depot-.35*(100-infra+damage)-fuel/equipment shortage penalties); isolated supply=8. Organization recovers 1.1/day above 40 supply, otherwise loses 2.2/day. Below 25 supply lose .3 strength/day. Reinforcement uses equipment (.15/day; .3 mobilized) above 50 supply. Recon shows more enemy locations; displayed strength remains an estimate, not secret exact values.

## Economy

Abstract credits and stockpile units. Daily revenue = capped productive industry * tax effort, reduced by sanctions, plus trade. Baseline spending + defence allocation + armies + mobilization + foreign policy upkeep. Deficits become debt accruing .03%/day interest. Taxes >40 reduce support. Mobilization costs 1.2/day and goods/support. Defence produces .018*allocation equipment/day and reduces civilian goods. Port pressure reduces fuel imports/energy; sanctions reduce revenue, fuel and equipment. Civilian goods shortages reduce support. Support feeds stability. Construction: industry 35 credits/25 days; depot 20/15d; equipment batch 25/15d yields 35 equipment. Construction pauses under foreign control.

## Diplomacy

Direct trade/access agreements require relations >=10 and 10 credits from each side. Trade is reciprocal; access directional. Compensation crises last 14 days: acceptance = -45 + round(.35*relations) + round(.8*offer) + round(.3*(100-targetSupport)) +15 per supporter. Ceasefire adds 25 + min(35,floor(day/8)); withdrawal subtracts 25. Reasons are shown before conclusion. No hidden acceptance roll. Offers 0–150, paid once on agreement; rejected/unaffordable offers do not pay.
Backing costs initiator 15/supporter 10 credits and requires alignment >=15. Access crises can escalate after 3 days; a current ceasefire blocks escalation. Mediation cannot be used as a war declaration. Withdrawal demands can escalate only against an occupier of national territory. Expired acceptable/affordable proposals conclude; others reject peacefully. Backdown costs 4 support.
Guarantee costs 15 plus upkeep. On a new war, guarantor pays 25 and sends 15 equipment if affordable; no automatic global war. Sanctions and maritime pressure cost 15 plus upkeep and last 90 days. Access/trade last 180 days. War raises escalation 14, guarantee activation 5, pressure 5, backing 3. Escalation decays .025/day; escalation is a diplomatic risk indicator in v1, not an autonomous intervention trigger.
Aid costs donor 20 credits+20 equipment; takes 5 days. Valid land path through access countries or both controlled unblocked ports required at dispatch and delivery. Interrupted convoy is lost. A Syria mediation agreement ends SYR–OPP conflict for 90 days along existing lines. Other belligerent ceasefires apply to that pair. Armies halt; combat cannot continue between ceasefire parties.

## AI and outcomes

Same command functions and economic/military rules. Weekly fiscal adjustment, wartime mobilization and periodic civilian-industry investment use the same priced commands. Energy shortages reduce industry yield and equipment output. Nearby reachable wartime objective chosen by shortest legal path. Weekly crisis evaluation; periodic allied aid, exhaustion-based Syrian peace proposals. No omniscient player-strength display or resource bonuses. External powers have budgets and guarantees/backing, not global army simulation. No scripted historical faction spawns.
Civilian-impact indices accrue during attacks, infrastructure damage lowers production/supply; harm affects legitimacy/support and exhaustion influences negotiation. These are abstract indices, never historical casualty counts. Losing all controlled territory or holding no capital for 30 days triggers player defeat. Observer continues AI simulation. One-year message does not end play.

## Worked decisions

TUR→SYR access with 65 credits: base -45, relations -30*.35≈-10, offer +52, support exhaustion +10 => positive score, so an agreement is possible. Zero compensation is refused. After 3 days the initiator can choose war, triggering the Russian guarantee if affordable.
IRN→SYR aid: overland through Iraqi access or open ports. Remove access and blockade the Syrian port before day 5: delivery fails and the shipment is lost.
