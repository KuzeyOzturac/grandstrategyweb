# Laws and diplomatic plays — revision 1.2

Read this before changing `laws.ts`, `LawPanel.tsx`, or play commands in `engine.ts`. This supersedes the four additive reforms and old no-concession backdown rules in NATIONAL_SYSTEMS.md/SYSTEMS.md.

## Law catalogue

48 policies in 16 mutually exclusive groups, organized into Power structure (governance, franchise, religion, bureaucracy, army model), Economy (economic system, trade, tax distribution, education, healthcare, police), and Human rights (speech/assembly, labor, welfare, citizenship, migration/refugees).

The initial choices are a shared balancing baseline, **not researched descriptions of each country's 2012 constitution**. Policy names describe the sandbox choices; effect values and interest-group positions are game design assumptions. Four interest groups remain aggregates, not Victoria 3's ideology/leader/pop simulation.

`laws.ts` is the catalogue and effect authority. Every choice has a distinct combination of living-standard target, production, research, daily fiscal cost, bureaucracy use, and/or daily radical reduction. Trade liberalization additionally changes route capacity and tariff revenue through the existing trade model. Effects stack across groups; alternatives within a group replace each other. The UI shows actual effects and totals, current law, relative supporters/opponents and checkpoint probabilities.

Reform costs 15 credits; requires 35 political support, 15 available bureaucracy, legitimacy >=25, and no other active reform or policy cooldown. Relative support/opposition determines checkpoint odds, while the existing weighted group endorsement score determines introduction eligibility. All groups' clout counts; government membership does not gate sponsorship in this adaptation.

Three stages: drafting, committee review, ratification. Each checkpoint requires 12 progress, advancing daily by max(0.25, legitimacy/75); legitimacy below25 freezes it. Checkpoint uses the campaign seed. Advance probability is clamp(50 + supporting clout*0.5 - opposing clout*0.35,20,85); setback probability clamp(10 + opposing clout*0.4 - supporting clout*0.15,5,45); remainder is debate. A debate consumes time and improves civic approval by0.5. A setback adds one radical point. Three advances enact; three setbacks fail, adding two radicals and a60-day group cooldown. Canceling adds support*0.04 radicals and the same cooldown. Enactment replaces the prior law and changes group approval by their relative policy positions. Existing approval dynamics continue afterward.

Old saves with any combination of the previous four reforms gain default laws for missing groups, retaining their enacted reforms and in-progress bill. Duplicate alternatives, unknown IDs, malformed stages or cooldowns are rejected. Save envelope remains v1 and map IDs are unchanged.

## Diplomatic plays

Seven primary goals: access; ceasefire; occupied-territory withdrawal; reparations; open market; arms limitation; humiliation. Descriptions in `DEMANDS` are the implementation contract. Coercive goals generate infamy when proposed. Truces block coercive play openings. Both principals must be free of another negotiation or play war when opening a new coercive play. Ceasefire proposals can be opened during a play war; accepted peace closes that play and its coalition hostilities.

Opening demands days0–2, bargaining days3–9, countdown days10–13. At14 days unresolved proposals can expire peacefully; **war remains an explicit initiator action**, rather than Victoria3's automatic countdown war. Mediation never permits declaring war. The three-day warning and truce checks remain mandatory.

Defender starts with humiliation as its primary counter-demand. Both sides have60 maneuvers; adding a secondary aim or changing the defensive primary costs20 and generates the goal's infamy. Goals cannot be duplicated on the same side. Demands and coalitions lock during countdown. Secondary demands are war aims, not extra compensation silently applied to a negotiated primary agreement.

Backing works for both principals, costs requester15 and supporter10 credits, requires relations>=15, and joins the supporter to the side's war coalition. Human countries cannot be recruited by an AI without consent. Each net supporter adds15 acceptance; additional attacking war aims subtract8 each. Goal severity, compensation, obligations, exhaustion, relations, and infamy remain visible reasons. A resistant AI defender may add reparations and seek one aligned backer during bargaining, using the same commands/costs as the player.

Negotiated agreement: initiating primary goal enforced, initiator pays compensation and any promised obligation is recorded. Backdown: conceding principal loses4 support and grants the opposing primary demand; no secondary goals or compensation. Escalation creates every cross-coalition war pair. Backing is a military commitment, not merely a score modifier.

War settlement is a separate screen: enforce victory at60 leverage or concede to the other side. Leverage = clamp(70*share of target provinces controlled +0.3*target exhaustion +0.08*positive effective-force difference,0,100), rounded. Effective force sums strength*organization/100. Winning primary and secondary aims are imposed, coalition hostilities end and90-day truces begin. Ceasefire talks are also available from the war screen, with compensation and the normal acceptance/consent rules. AI principals concede when the opponent reaches75 leverage. This is a bounded capitulation system, not a full peace conference or occupation of independently simulated global states.

Reparations: loser pays0.6 credits/day for180 days; any cash shortfall becomes its debt. Arms limitation: immediate25% equipment reduction, demobilization and defence-spending cap35, binding for180 days; forbidden policy commands fail without mutation. Open market removes bilateral sanctions/blockades and creates180-day trade cooperation. Humiliation costs12 support/8 legitimacy, reduces10 infamy, and gives victor5 support. Withdrawal restores control, not ownership. Treaty expiry uses the standard daily tick.

## Scope boundary

Full revolutions, ideology/leader-specific endorsements, policy movements, constitutional amendments, institution investment levels, subjects, territorial annexation, regime imposition, rank-based maneuver budgets, reverse sways and multi-party peace conferences remain future work. No placeholder buttons promise these. All map polygons and army logistics continue to use the established real-geometry engine.

## References and provenance

Requested sources reviewed 2026-10-16:
- [Laws](https://vic3.paradoxwikis.com/Laws)
- [Power structure laws](https://vic3.paradoxwikis.com/Power_structure_laws)
- [Economy laws](https://vic3.paradoxwikis.com/Economy_laws)
- [Human rights laws](https://vic3.paradoxwikis.com/Human_rights_laws)
- [Diplomatic play](https://vic3.paradoxwikis.com/Diplomatic_play)
- [Explaining every law in TNO](https://www.reddit.com/r/TNOmod/comments/lu9r87/explaining_every_law_in_tno/), community discussion, 2021-03-01.

Direct wiki retrieval returned401/internal retrieval errors. The readable material was a [public text snapshot](https://github.com/maxzxc0110/Victoria3/tree/main/Victoria_3_Wiki/knowledge_base), dated2026-08-12, attributing each page's source URL and identifying game version1.13. It is a third-party mirror, not confirmation of today's exact game rules. TNO post was read directly; it is an old community taxonomy rather than current official mod documentation. Its modern policy areas informed the catalogue, not copied descriptions or effect numbers. Snapshot sections themselves can carry older-version warnings.

Victoria3's exclusive policy groups, contested legislation, diplomatic stages, coalitions, primary/secondary goals and concessions are the core design inspiration. TNO's modern franchise, press, migration, taxation and social-service choices inform the2012 adaptation. All formulas, durations, effects and implementation here are original simplified rules. Official law enactment/background sources remain in VICTORIA3_RESEARCH.md.
