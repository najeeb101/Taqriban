# Content brief: rewrite of puzzles 1-10 in the Fermi style (2026-10-29)

> Historical: the slot plan and lanes below applied to puzzles 1-10 only. New questions follow the current style in `content/README.md` (no structure, funny, campus rare). The hard rules, research rules and category list still apply.

Binding instructions for the three content writers. Read `content/README.md` (format, style, checklist) first; this brief adds the slot plan and the research rules. Puzzle 1 goes live 2026-10-30 (Asia/Qatar).

## What a good question looks like
A question the player can **build** from things they have a feel for, in 3 or more multiplications or divisions, about everyday, playful things. Not "do you know this official statistic".

Good shapes (tone only; do not copy fermi.gg's actual questions):
- "How many X would weigh as much as Y?" (gummy bears vs a grizzly bear)
- "How many X fit inside Y?" (tennis balls in a school bus)
- "How many X does a person do in a year / lifetime?" (steps of a mail carrier, blinks, heartbeats in a football match)
- "How much would it cost to fill Y with X?" (Olympic pool of milk, in riyals)
- "How long would it take to ...?" (walk the Corniche N times, count to a million)

Bad shapes (do not write): national production in tonnes, passenger/visitor totals, populations, energy in TWh, anything that is a headline statistic.

## Hard rules
- **Answer:** one positive number, at most **100,000,000** (the import refuses more). Aim for 100 to 10,000,000.
- **Unit (`unit_ar`):** everyday: a count of the thing (تمرة، كرة، خطوة، كوب), ريال قطري, دقيقة/ساعة/يوم/سنة, كيلومتر/متر, كيلوغرام. Never طن، تيراواط ساعة، حاوية قياسية، متر مكعب، نسمة.
- **Factual and sourced:** every input of the chain comes from a real, reputable page you actually opened (WebSearch + WebFetch). The answer is **computed from those sourced inputs** and rounded to 2 significant figures (e.g. 81,000). Show the computation in `## ملاحظات للمحرر` with one line per input: value, quote, URL. If a needed input cannot be sourced, change the question. Never invent numbers.
- `source_url` / `source_name` = the page for the most important input. All other sources go in the notes.
- **Unambiguous:** state the assumption the answer depends on in the question itself (e.g. «جمل بالغ وزنه نحو 500 كغ» is fine only if you then do not let the camel weight be the thing being guessed; better: let the player estimate both and pick sourced averages). Say exactly what is counted and the time frame.
- **Arabic:** clear, friendly MSA, at most about 25 words, no dialect, Western digits. `unit_ar` must read naturally after a big number. A little humour is welcome; nothing rude, political or religious.
- **Napkin math (`## الحساب على الورقة`):** 3-5 numbered steps, simple MSA, rounded friendly numbers, lands within about 2x of the answer and is not suspiciously exact.
- **Difficulty by position:** `position: 1` = easy (an average university student lands within 2-3x; difficulty 1-2). `position: 2` = medium (difficulty 3). `position: 3` = hard, longer chain, typical miss 10x+ (difficulty 4-5).
- **category:** one of `agriculture architecture aviation body construction culture demographics education energy food industry media nature shipping space sports tourism trade transport water` (each has an icon). Prefer the one a player would expect.
- **region:** as given in your slot list.
- No near-duplicates within your own set, and stay inside your lane (below) so the three writers do not collide.

## File format (unchanged)
Overwrite the existing file at the exact path in your slot list. Keep this structure:

```
---
puzzle: N
position: P
category: <slug>
region: <region>
difficulty: <1-5>
unit_ar: <unit>
answer: <number, no commas>
as_of: "<year of the newest input>"
source_url: <https://...>
source_name: "<publisher - page>"
---
## السؤال
<question>

## الحساب على الورقة
1. ...
2. ...
3. ...

## ملاحظات للمحرر
- المدخلات: <value> - "<quote>" - <URL>  (one line per input)
- الحساب: <the exact computation and rounding>
- لماذا السؤال جيد؟ <what makes it fun; the common mistake>
```

## Slot plan (who writes which file)
Positions rotate so each puzzle has one question from each lane and difficulty rises within the puzzle.

| Puzzle | position 1 (easy) | position 2 (medium) | position 3 (hard) |
|---|---|---|---|
| 1 | Universal | Arab world (gulf) | Qatar / campus |
| 2 | Qatar / campus | Universal | Arab world (levant) |
| 3 | Arab world (egypt) | Qatar / campus | Universal |
| 4 | Universal | Arab world (maghreb) | Qatar / campus |
| 5 | Qatar / campus | Universal | Arab world (gulf) |
| 6 | Arab world (levant) | Qatar / campus | Universal |
| 7 | Universal | Arab world (egypt) | Qatar / campus |
| 8 | Qatar / campus | Universal | Arab world (maghreb) |
| 9 | Arab world (gulf) | Qatar / campus | Universal |
| 10 | Universal | Arab world (levant) | Qatar / campus |

(File name = `content/questions/pNNN-qP.md`, e.g. puzzle 4 position 2 = `p004-q2.md`. "gulf" means the Gulf outside Qatar: Saudi Arabia, UAE, Kuwait, Oman, Bahrain.)

### Lane: Qatar / campus (region `qatar` or `campus`)
Files: p001-q3, p002-q1, p003-q2, p004-q3, p005-q1, p006-q2, p007-q3, p008-q1, p009-q2, p010-q3. At least 3 should be `campus` (Qatar University life: lecture halls, the QU metro station, exam season, the library, karak at the canteen). Others: Doha Corniche, Lusail Stadium, Souq Waqif, the Doha Metro, desert camping, the Pearl, Hamad Airport, falcons, Qatar's summer heat, karak, machboos. No date-fruit questions (Arab-world lane owns dates).

### Lane: Arab world (regions `gulf`, `levant`, `egypt`, `maghreb` exactly as in the table)
Files: p001-q2 (gulf), p002-q3 (levant), p003-q1 (egypt), p004-q2 (maghreb), p005-q3 (gulf), p006-q1 (levant), p007-q2 (egypt), p008-q3 (maghreb), p009-q1 (gulf), p010-q2 (levant). Ideas: dates vs camels, Burj Khalifa (steps, windows), the Nile, the pyramids' blocks, falafel, koshary, couscous, Moroccan mint tea, Petra, Mount Lebanon cedars, Dead Sea salt, Riyadh Metro, Omani frankincense. No Qatar topics.

### Lane: Universal (region `universal`)
Files: p001-q1, p002-q2, p003-q3, p004-q1, p005-q2, p006-q3, p007-q1, p008-q2, p009-q3, p010-q1. Everyday objects and the human body: heartbeats, blinks, hair, footballs, phones and chargers, grains of rice, LEGO bricks, an Olympic pool, a jumbo jet, the Moon distance in stacked things, lifetime habits. Nothing tied to a specific Arab country.

## When you are done
1. Run `npm run import -- --start 2026-10-30 --dry-run` from the repo root (validates every file, changes nothing). Your files must produce no `!` errors and no `~` unit warnings.
2. Do NOT run the import without `--dry-run`, do not touch the database, do not edit any file outside your 10 slots, do not commit.
3. Report back: a table of your 10 files with the question, answer, unit, and the main source; and anything you were unsure about.
