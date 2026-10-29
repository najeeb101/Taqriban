# Content brief: puzzles 11-20 (2026-10-29)

Binding instructions for the three content writers. Read `content/README.md` and `Docs/CONTENT_BRIEF.md` first: every rule there (what a good question looks like, hard rules, file format, difficulty by position, categories) applies unchanged. This brief only adds the new slot plan and the topics already taken. Puzzle 11 publishes 2026-11-09 (Asia/Qatar).

The files are **new**: create them at the exact paths below (they do not exist yet).

## Slot plan

| Puzzle | position 1 (easy) | position 2 (medium) | position 3 (hard) |
|---|---|---|---|
| 11 | Qatar / campus | Universal | Arab world (egypt) |
| 12 | Arab world (maghreb) | Qatar / campus | Universal |
| 13 | Universal | Arab world (gulf) | Qatar / campus |
| 14 | Qatar / campus | Universal | Arab world (levant) |
| 15 | Arab world (egypt) | Qatar / campus | Universal |
| 16 | Universal | Arab world (maghreb) | Qatar / campus |
| 17 | Qatar / campus | Universal | Arab world (gulf) |
| 18 | Arab world (levant) | Qatar / campus | Universal |
| 19 | Universal | Arab world (egypt) | Qatar / campus |
| 20 | Qatar / campus | Universal | Arab world (maghreb) |

- **Qatar / campus** (region `qatar` or `campus`, at least 4 `campus`): p011-q1, p012-q2, p013-q3, p014-q1, p015-q2, p016-q3, p017-q1, p018-q2, p019-q3, p020-q1.
- **Arab world** (region exactly as in the table): p011-q3 (egypt), p012-q1 (maghreb), p013-q2 (gulf), p014-q3 (levant), p015-q1 (egypt), p016-q2 (maghreb), p017-q3 (gulf), p018-q1 (levant), p019-q2 (egypt), p020-q3 (maghreb). No Qatar topics.
- **Universal** (region `universal`): p011-q2, p012-q3, p013-q1, p014-q2, p015-q3, p016-q1, p017-q2, p018-q3, p019-q1, p020-q2. Nothing tied to a specific Arab country.

## Already used in puzzles 1-10: do not reuse these topics or yardsticks
Blinks, heartbeats, hair loss, blood pumped, words spoken, keystrokes, push-ups. Dates vs a camel, camels stacked to Burj Khalifa, olives for Lebanese olive oil, falafel Beirut-Damascus, Moroccan mint tea, Dead Sea salt, the Great Pyramid's blocks, Tutankhamun's mask, Al Boraq across the Sahara, the Dubai Fountain. QU lectures, karak vs QU tuition, QU library books per seat, Corniche walk, Lusail Stadium by metro, Stadium 974 containers, pearl-diving dives, falcons vs Land Cruisers, football pitches covering Qatar. Footballs in a pool, LEGO to Everest, walking to the Moon, iPhone charges from petrol, A4 sheets on a pitch.

**Yardsticks already overused:** Olympic pool (3 times), FIFA football pitch (2), adult camel (2). Do not use them again in this batch.

Fresh directions (ideas, not a list to copy): weights and lengths of everyday things in a lifetime (toothpaste, shoes, pens, chewing gum), money-flavoured questions in ريال قطري, time questions («how long would it take to …»), food portions (machboos rice grains, shawarma, koshary, couscous, ka'ak, hummus), transport (Riyadh Metro, Cairo traffic, Hamad Airport walkways, desert camping drives), architecture (Qasr Al Watan, Hassan II Mosque minaret, Cairo Tower, Jeddah Tower), nature (sand grains, palm trees, sea turtles, oryx), space and energy at an everyday scale. Spread the categories: no more than 2 `education` and 2 `body` per lane.

## When you are done
1. From the repo root run `npm run import -- --start 2026-10-30 --dry-run` (validates every file, changes nothing). Your files must produce no `!` errors and no `~` unit warnings.
2. Do NOT run the import without `--dry-run`, do not touch the database, do not edit any file outside your 10 slots, do not commit.
3. Report back: a table of your 10 files with the question, answer, unit and main source, plus anything you were unsure about.
