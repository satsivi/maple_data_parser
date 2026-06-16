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
Variables are in maple-constants.js.
