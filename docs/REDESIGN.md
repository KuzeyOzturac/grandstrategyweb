# Country-first national-management revision

## Interaction contract

Click a foreign province: open its controller's dossier and actions immediately; highlight the country and province shapes. Click own territory: national overview + state inspection; Production uses that location. Right-click has the same behavior, without opening the browser menu. Country geometry on the global map also opens a dossier; unsupported global countries explicitly state the regional boundary. No native rectangular focus outlines on SVG objects. Keyboard focus uses the object's actual stroke, preserving discoverability.

## Military contract

The player chooses advance/defend/standby per enemy, mobilization and air mission. Commanders select routes, deploy and fight. The engine's legacy unit-order command remains for simulation tests and older saves; the UI does not expose it. Explicit legacy orders suppress automatic reassignment for 30 days. Strategic stance changes clear that override. No army counters obscure the map; small front markers expose ongoing wars.

## Connected model

society.ts owns aggregate national markets, households, interest groups, institutions, research, construction, trade and relationship missions. Engine remains the command gateway; society has no DOM/clock/storage dependencies. Price ratios connect supply/demand to household consumption; living conditions affect political approval/radicals; laws add benefits, costs and administration; construction changes production and employment. Routes cannot manufacture exports from an empty surplus. War/embargo/blockade interrupt trade.

## Usability

National overview lists actual shortages and outstanding decisions. Diplomatic actions show reasons when disabled. Plays preview acceptance before committing; phases and remaining days stay visible. Construction supports priority and partial refunds. Weekly trends appear as data accumulates. Simulation speeds: 2 / 0.7 / 0.2 seconds per game day. All commands can be issued while paused.

## Save compatibility

Keep the v1 save envelope. Earlier saves without society data are migrated by adding a default national-management model; existing country/army/province state is preserved. Current saves validate the new references and numeric fields. Map geometry/IDs are unchanged.

## Limits

This is a connected aggregate adaptation, not a pop-by-pop economic simulation. See VICTORIA3_RESEARCH.md for implemented/deferred coverage. Do not market the revision as a complete Victoria 3 clone.
