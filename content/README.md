# محتوى تقريباً / Taqriban content

## Format / الصيغة
One file per question: `content/questions/pNNN-qP.md` (NNN = puzzle number, P = position 1-3: easy, medium, hard).

Front-matter (valid YAML): `puzzle`, `position`, `category`, `region` (universal | gulf | levant | egypt | maghreb | qatar | campus), `difficulty` (1-5), `unit_ar` (short Arabic noun), `answer` (plain positive number, no commas), `as_of` (quoted string), `source_url`, `source_name` (quote strings containing `:` or `#`).
Body sections, in this order: `## السؤال`, `## الحساب على الورقة` (3-5 numbered steps), `## ملاحظات للمحرر` (exact figure quoted, where it appears, caveats).

## Puzzle numbers and dates / أرقام الألغاز والتواريخ
Puzzle N publishes on `START_DATE + (N - 1)` days (Asia/Qatar day). `START_DATE` is set by the import script; the files carry no dates.

## Style: Fermi questions, not statistics trivia / الأسلوب
A good question is one a player can **build** from things they already have a feel for, in 3 or more multiplications. A bad one is a figure you either happen to know or cannot reason about at all.

- **Everyday, playful objects.** Dates, camels, cups of karak, footballs, school buses, phone charges, steps, grains of rice. Funny comparisons are welcome: «how many X would weigh as much as Y», «how many X fit inside Y», «how long would it take to …».
- **The answer must come from a chain.** Napkin math multiplies a few estimable pieces (size × count × rate). If the only route is "know the official statistic", rewrite the question.
- **Answer size: hard limit 100,000,000** (the import refuses anything larger). The sweet spot is roughly 100 to 10,000,000.
- **Everyday units.** Count things, money (QAR), time, distance or weight in kg. Avoid tonnes, TWh, TEU, m³ and «نسمة» (the import warns on these).
- **Still factual.** Each piece of the chain comes from a real source, and the answer is computed from those pieces. The notes show the calculation and cite each source. Never invent numbers.
- **Funny is fine, rude is not.** Same respect rules as below.

Examples of the tone (to be sourced before use): «كم تمرة تزن بقدر جمل بالغ؟»، «كم كوب كرك يكفي لملء حوض سباحة أولمبي؟»، «كم خطوة يمشيها طالب جامعة قطر في فصل دراسي كامل؟».

## Checklist before scheduling / قائمة التحقق
- Answer is one positive number with an explicit unit and time frame in the question; unambiguous about what is counted; `as_of` matches the figure.
- Source is real and reputable; `source_url` is the page that contains the figure; the notes quote it. No page opened or authoritative result found -> replace the question. Never invent numbers.
- Napkin math: 3-5 steps, simple MSA, Western digits, reasonable assumptions, correct arithmetic, within ~2x of the answer, and not suspiciously exact.
- Difficulty rises within the puzzle (pos 1 within 2-3x for an average student; pos 3 typical miss 10x+).
- Each puzzle has one universal, one Arab-regional and one Qatar/campus question; regions rotate (Gulf, Levant, Egypt, Maghreb); no near-duplicates; at most 3 aviation questions in the whole set.
- Arabic is clear friendly MSA, at most about 25 words, no dialect, no typos; `unit_ar` reads naturally after a big number.
- Respectful: no politics, conflict or religious rulings. Nothing copied from fermi.gg.
- Second reviewer re-checks the number against the source before the date is locked.

## Validate / التحقق
Parse every file with `gray-matter` and check the points above (answer is a positive number, `as_of` is a string, three section headings exist, question is 25 words or fewer).
