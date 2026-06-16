# maple_data_parser
Data parsing utilities + consts for vibing with Maple

## Parser
What is this all for?: Parses clipboard stat data from Maplescouter's Stat Efficiency section and converts it into an easier-ish to use data structure.

Click the copy button on Scouter's Stat Efficiency section -> paste it into the parser -> get a data structure that's somewhat usable. The output has already been divided by the default values to give you the Stat (you picked) of

Currently there's only Final Damage % and Main Stat equivalences working. 
This is on purpose because I don't really think the community uses the other types in existing tools.
I didn't bother adding in error throwing for putting in the wrong stat. Let's just stick to these 2 so people don't blow things up with the wrong stat...

Sample Input (Select Demon Avenger)
```
항목	Value	Final Damage%
Boss Damage	40	3.805%
Attack	30	0.479%
Attack%	12	3.585%
Critical Dmg	8	2.578%
Ignore Dff(300)	40	0.428%
Ignore Dff(380)	40	0.543%
HP	30	0.012%
HP%	12	0.731%
Not Affected by % HP	200	0.006%
STR	30	0.004%
STR%	12	0.078%
Not Affected by % STR	200	0.026%
All Stat%	9	0.059%
```

Sample Output
```
{
  "class": "demon_avenger",
  "stat_type": "hp",
  "equivalence_type": "final_damage",
  "weights": {
    "boss_damage": 237.8125,
    "attack": 39.916667,
    "attack_pct": 746.875,
    "critical_damage": 805.625,
    "ied_300": 26.75,
    "ied_380": 33.9375,
    "primary_stat": 1,
    "primary_stat_pct": 152.291667,
    "flat_unaffected_primary_stat": 0.075,
    "secondary_stat": 0.333333,
    "secondary_stat_pct": 16.25,
    "flat_unaffected_secondary_stat": 0.325,
    "all_stat_pct": 16.388889
  }
}
```
Other Sample Inputs:
Xenon (GMS Mode, Reboot, Main Stat)
```
항목	Value	Main Stat
Boss Damage	40	883.33
Attack	30	122.97
Attack%	12	968.78
Critical Dmg	8	641.11
Ignore Dff(300)	40	121.46
Ignore Dff(380)	40	154.34
STR	30	30.00
STR%	12	79.80
Not Affected by % STR	200	22.55
DEX	30	30.00
DEX%	12	94.48
Not Affected by % DEX	200	22.55
LUK	30	30.00
LUK%	12	104.09
Not Affected by % LUK	200	22.55
All Stat%	9	208.77
```
Xenon (GMS Mode, Reboot, FD%)
```
항목	Value	Final Damage%
Boss Damage	40	3.476%
Attack	30	0.484%
Attack%	12	3.812%
Critical Dmg	8	2.523%
Ignore Dff(300)	40	0.478%
Ignore Dff(380)	40	0.607%
STR	30	0.118%
STR%	12	0.314%
Not Affected by % STR	200	0.089%
DEX	30	0.118%
DEX%	12	0.372%
Not Affected by % DEX	200	0.089%
LUK	30	0.118%
LUK%	12	0.410%
Not Affected by % LUK	200	0.089%
All Stat%	9	0.822%
```

Melee Thief (DB, GMS Mode, Reboot, Main Stat):
```
항목	Value	Main Stat
Boss Damage	40	496.03
Attack	30	60.17
Attack%	12	536.06
Critical Dmg	8	327.38
Ignore Dff(300)	40	49.81
Ignore Dff(380)	40	63.24
LUK	30	30.00
LUK%	12	111.07
Not Affected by % LUK	200	18.81
DEX	30	2.98
DEX%	12	15.81
Not Affected by % DEX	200	4.70
STR	30	2.98
STR%	12	12.43
Not Affected by % STR	200	4.70
All Stat%	9	104.48
```
Standard Class (Night Lord, KMS Mode, Non Reboot, FD):
```
항목	Value	Final Damage%
Boss Damage	40	3.419%
Attack	30	0.491%
Attack%	12	3.749%
Critical Dmg	8	2.432%
Ignore Dff(300)	40	0.761%
Ignore Dff(380)	40	0.969%
LUK	30	0.231%
LUK%	12	0.885%
Not Affected by % LUK	200	0.152%
DEX	30	0.019%
DEX%	12	0.118%
Not Affected by % DEX	200	0.038%
All Stat%	9	0.752%
```


Variables are in maple-constants.js.
