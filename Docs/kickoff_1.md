# Kickoff — Arabic Daily Estimation Game («تقريباً» — working title)

> A free daily game of Fermi-style estimation, built Arabic-first and right-to-left from day one.
> Three "impossible" questions a day, one guess each, scored by how close you get. Compare with friends, your university, and the whole Arab world.

**Status:** pre-build kickoff · **Owner:** Najeeb · **First audience:** Qatar University students and friends, then the wider Arab world.

---

## 0. How to read this document

- `kickoff.md` (this file): **what** we are building and **why**. Product spec, reverse-engineering of Fermi, UX, content, roadmap.
- `docs.md`: **how** we build it. Stack, database schema, API, scoring code, RTL guide, question-authoring guide.

Labels used below:
- **[Observed]**: seen directly on fermi.gg (fetched 2026-10-28).
- **[Inferred]**: deduced from observed data; treat as a good hypothesis.
- **[Our call]**: our own decision, not copied from Fermi.

---

## 1. The pitch

Wordle proved that a **tiny daily puzzle + a shareable result + a feeling of "how did I do vs everyone"** can become a habit. Fermi applies that loop to **number sense**: "How many iPhones have been produced since 2007?" You can't Google it (honor system), you do napkin math, lock in a guess, and the game tells you how many times off you were.

There are Arabic Wordles, Arabic trivia and Arabic crosswords. **I found no Arabic Fermi-style estimation game** (absence in search is not proof, but it's a strong signal). The opportunity:

1. A proven mechanic with no Arabic-native version.
2. **Local content** (dates, camels, desalination, Hamad airport, QU campus) makes it feel like *ours*, which a translation of English questions never will.
3. The university angle: group leaderboards make it spread through friend groups, classes and WhatsApp.

---

## 2. Positioning and non-goals

**Positioning:** "The daily game that teaches you to think in numbers, with questions from our world."

**Goals (v1)**
- Fully Arabic, RTL, mobile-first, works on any phone browser, installable as a PWA.
- Daily puzzle, 3 questions, one guess each, score + percentile + shareable result.
- Leaderboards with **private groups** (university / friends) from the start. This is our growth engine.
- Archive of past puzzles.
- Question submissions from users.

**Non-goals (v1)**
- No native apps. No multiplayer real-time mode. No monetization. No ads. No English UI (design so i18n can be added later, but don't build it).
- No copying Fermi's branding, copy, art or questions. We copy the **mechanic** (a public estimation technique), not the identity. Use our own name, look and questions.

---

## 3. Reverse-engineering Fermi (fermi.gg)

### 3.1 What it is [Observed]
- "A free daily game of Fermi estimation. Three impossible questions, one guess each, scored on how close you get."
- Puzzles are **numbered** (page showed "No. 093", "Fermi #093 – October 27, 2026") and dated.
- New puzzle published **every day at midnight ET** [Observed]. Full archive available from a side menu [Observed].
- Free, no account needed to play [Inferred from the landing page having a direct "Play Today's →" button and no sign-up prompt].
- Dark/light support (`color-scheme: light dark`), installable-style meta tags for mobile (`mobile-web-app-capable`) [Observed in page metadata].
- Visual identity: warm off-white paper (`#e9e6de` theme color) with a chalkboard motif (Enrico Fermi at a chalkboard image) [Observed].

### 3.2 The core loop [Observed]
1. **Make your best guess.** "No Googling. Just napkin math, gut instinct, and a built-in calculator when you need it."
2. **See how close you were.** The answer is revealed, you're scored "on how far off you are (as a multiple of the real answer)", and you get **example math** you could have used.
3. **Compare with friends.** Daily score, rank vs all players, and a **share** (share card + copy text).

### 3.3 Screen-by-screen anatomy

**A. Landing / home**
- Puzzle number + date, three question tabs (Q1 Q2 Q3), a big "Play Today's →" button.
- "How to Play" in 3 steps, "What is a Fermi question?" explainer (Enrico Fermi, atomic bomb paper-scraps anecdote), "Submit your own question" section with example user questions credited by first name ("-Jeff", "-Judy", "-Robby"), FAQ.

**B. Question screen** (`Q1 / 3`)
- The question text (example: "How many iPhones have been produced since the launch in 2007?").
- A numeric input with a **unit label** to its side ("iPhones") and a **"Lock it in ↵"** button (Enter key submits).
- **Built-in calculator** opened from an icon.
- **One guess only**: locked in once submitted.

**C. Reveal screen** (after each question)
- "You guessed **1,245**" → "Answer **1,800** Oreos" (note: the example mixes two different questions; the layout is what matters).
- "You landed **1.45× Too Low**" (the multiple + direction).
- "**closer than 62% of players**" (per-question percentile).
- **"How everyone guessed"**: a distribution chart on a **log scale** with markers for *You* and the *answer* (axis example: 180 · 1.8K [answer] · 18K).
- **"Napkin math"**: a worked example of how to estimate it.
- A "Question 2 →" button.

**D. Results screen (end of day)** [Observed from the "Compare with friends" example]
- "Fermi No. 005 – July 27th, 2026"
- **Score 1.94×**, **Top 8%**.
- "How everyone did": a distribution on a log axis (1× · 10× · 100× · 1,000×) with a *You* marker.
- Per-question list: question text, multiple, and a **direction arrow** ("< 1.45×" = you guessed too low, "> 2.18×" = too high).
- **Share Card** and **Copy Text** buttons.

**E. Menu / other**
- Archive (past puzzles), Submit a question, FAQ, How to play.

### 3.4 Scoring rules [Observed + Inferred]
- Score per question = **multiple off**: perfect = **1×**, off by double = **2×**, off by ten times = **10×**. Lower is better [Observed in the FAQ].
- It's symmetric: guessing half of the answer and guessing double the answer are both 2× [Inferred from "as a multiple"; the example shows "Too Low"/high labels using the same multiple].
- The FAQ says "your score for the day is the average of your three." **But the numbers don't match a plain average** [Inferred, checked below]:

| Question | Multiple |
|---|---|
| Oreos | 1.45× |
| London bus tickets | 2.18× |
| Mail carrier steps | 2.30× |

  - Arithmetic mean = (1.45 + 2.18 + 2.30) / 3 = **1.98×**
  - **Geometric mean** = (1.45 × 2.18 × 2.30)^(1/3) = 7.27^(1/3) ≈ **1.94×**  ← matches the displayed **1.94×**

  So the daily score is almost certainly a **geometric mean** (which is the right choice for ratios: one terrible miss doesn't dominate as brutally). **[Our call] We use the geometric mean too**, and describe it simply as "المتوسط (بالضرب)" / "average multiple" in the UI.

- Percentiles: "closer than 62% of players" = share of players whose multiple on that question was **worse** than yours. "Top 8%" = share of players whose daily score was equal or better than yours (best 8%). Exact tie handling is unknown [Unknown → our definition in §5].

### 3.5 Things we cannot see (so we decide ourselves) [Unknown]
- How guesses are stored, whether there are accounts, how streaks work, how percentiles are cached, the share-card generator, anti-cheat, and the moderation flow for submitted questions. See §6 and `docs.md`.

---

## 4. Product spec (our version)

### 4.1 Name and identity [Our call]
Working title **«تقريباً»** ("approximately"). Alternatives: «حدس», «خمّن», «بالتقريب». Pick one that is short, easy to type, and has an available domain. Do **not** use "Fermi" in the brand (avoid confusion with fermi.gg); we can still explain the technique as «تقدير فيرمي».

Look and feel: warm paper background, ink-dark text, one strong accent colour, a chalkboard/«سبّورة» or hand-written-number motif. Generous spacing (Arabic needs more line-height). Dark mode from day one.

### 4.2 Tone of voice [Our call]
- **Simple Modern Standard Arabic** with a friendly, light tone, understood from Morocco to Oman. No heavy dialect in UI copy.
- Playful, never preachy. Short sentences.
- Questions are written in neutral MSA; units spelled out.

### 4.3 Screens and flows

**1. Home**
- Header: logo, menu button, streak flame (if any).
- Hero: "اللغز رقم 12 · الأربعاء 28 أكتوبر" + three progress dots + **«العب اليوم»**.
- If already finished today: show today's result summary + countdown «اللغز القادم بعد 05:32:10» + «شارك نتيجتك».
- Sections: كيف تلعب؟ (3 steps) · ما هو سؤال فيرمي؟ · اقترح سؤالاً · الأسئلة الشائعة.

**2. Question screen** (`السؤال 1 / 3`)
- Question text (large), category chip (optional), unit label beside the input.
- Numeric input (accepts Western digits, Arabic-Indic digits, and words like «5 مليون», see `docs.md` §6).
- Calculator button (drawer), **«ثبّت إجابتك»** button, Enter key submits.
- Confirm step? **No**: one tap locks it (like Fermi). Show a brief "are you sure" only if the guess is wildly out of typical range? Skip in v1.
- Guard rails: positive numbers only; reject empty/zero/negative with a friendly message.

**3. Reveal screen**
- «خمّنت 1,245» → «الإجابة 1,800 تمرة».
- Big result chip: **«أقل من الإجابة بـ 1.45×»** or **«أكثر من الإجابة بـ 1.45×»** (colour-coded by tier).
- «أقرب من 62% من اللاعبين».
- Distribution chart "كيف خمّن الجميع" on a log scale, with markers for you and the answer.
- «حساب على الورقة» section: step-by-step estimation example in Arabic + source link (read-only, collapsible).
- Button: **«السؤال التالي»** (or **«شاهد نتيجتك»** on Q3).

**4. Results screen**
- Daily score (big), «أفضل من X% من اللاعبين», tier badge (see §4.5).
- Distribution of all players' daily scores on a log axis with your marker.
- Per-question rows: text, multiple, direction arrow (⬇ too low / ⬆ too high), tier colour square.
- Actions: **«شارك»** (share card image), **«انسخ النص»**, **«المتصدرون»**, **«مجموعتي»**.
- Countdown to the next puzzle.

**5. Leaderboards** (see §6)

**6. Archive**
- List of past puzzles by number/date with your score if played. Playing an archived puzzle: scores **count for your personal stats but not for the daily leaderboard** [Our call, avoids leaderboard gaming and spoilers].

**7. Profile / stats**
- Games played, average score (geometric), best day, current and best streak, personal distribution histogram, display name, university tag, digit style (Western / Arabic-Indic), theme.

**8. Submit a question**
- Fields: question text, unit, your best-known answer, source link, optional napkin math, optional name for credit (first name or handle). Goes to a moderation queue (see §8).

**9. Settings**
- Digit style, theme (auto/light/dark), reduce motion, sign in / link account, delete my data.

### 4.4 Game rules
- 3 questions/day, ordered **easy → hard** [Our call].
- One guess per question, no edits.
- Guess must be a positive number.
- The puzzle day changes at **00:00 Asia/Qatar (UTC+3)** [Our call; Fermi uses midnight ET]. All countdowns use that clock.
- Answers are **never sent to the browser before the guess is locked** (see anti-cheat in `docs.md`).
- Progress resumes if you close the tab mid-puzzle.

### 4.5 Tiers and fun [Our call, optional but cheap and shareable]
Daily score tier, shown as an emoji square and an Arabic title:

| Daily score | Square | Title (example) |
|---|---|---|
| ≤ 1.25× | 🟩 | قنّاص |
| ≤ 2× | 🟩 | حدسك ممتاز |
| ≤ 5× | 🟨 | قريب |
| ≤ 20× | 🟧 | تحتاج تدريب |
| > 20× | 🟥 | خمّنت في الظلام |

Per-question squares in the share text use the same thresholds on that question's multiple.

---

## 5. Scoring and percentile spec (precise)

```
multiple(q)  = max(guess / answer, answer / guess)          # >= 1, lower is better
direction(q) = guess < answer ? LOW : guess > answer ? HIGH : EXACT
daily_score  = exp( mean( ln(multiple(q_i)) ) )              # geometric mean of the 3 multiples
```

- **Per-question percentile** ("أقرب من X% من اللاعبين") = `100 × (# of other players with a larger multiple on this question) / (# of other players)`. Shown only when at least ~20 players have answered; otherwise show «لا يوجد عدد كافٍ من اللاعبين بعد».
- **Daily "Top Y%"** = `100 × (# players with daily_score <= yours) / (# players who completed the puzzle)`, rounded up. Same minimum-N rule.
- **Ties** (equal multiples) count as "not worse", so you are never penalised for a tie.
- **Display rounding:** 2 decimals under 10×, 1 decimal 10–100×, integer above 100×. Cap displayed multiples at «+1000×» to avoid silly numbers.
- **Histogram bins:** bin on `log10(guess / answer)` with **4 bins per decade** (width 0.25), clamped to ±3 decades, so the answer is always the centre and "too low" is on one side, "too high" on the other.

---

## 6. Leaderboards and social (the growth engine)

This is where we deliberately go beyond Fermi's "compare with the rest of the world".

### 6.1 Identity (low friction)
- **Guest-first:** play instantly. A guest identity is created silently (anonymous auth), so scores persist on that device.
- **Display name** (a nickname, no real name needed) with an Arabic-aware profanity filter and length limit.
- **Optional account** (email magic link or Google) to keep streaks across devices. Guest → account upgrade keeps history.
- **University tag** (optional): QU, HBKU, Texas A&M Qatar, etc. as a pick-list, so we can show per-university rankings.

### 6.2 Boards
| Board | Scope | Ranking rule |
|---|---|---|
| **اليوم** (Today) | Everyone who finished today's puzzle | lowest daily score; tie → earlier finish time |
| **الأسبوع** (This week) | Everyone | geometric mean of daily scores, **min 3 days played** to qualify |
| **كل الأوقات** (All-time) | Everyone | geometric mean over all days, min 10 days |
| **الجامعة** (University) | Players with the same university tag | same rules, filtered |
| **مجموعتي** (My group) | Private group by invite code | same rules, filtered, **shows everyone in the group, even unranked** |
| **السلسلة** (Streaks) | Everyone / group | longest current streak |

### 6.3 Groups (key feature for university use)
- Create a group: name + type (friends / class / university club). Get a **short invite code and a share link** (works great pasted into WhatsApp).
- Join via code/link. A player can be in several groups.
- Group page: today's results (who finished, their scores) **without revealing guesses/answers to people who haven't played yet** (spoiler protection: before you finish today's puzzle you only see "X players finished").
- Group owner can rename, remove members, regenerate the code.

### 6.4 Sharing
- **Copy text** (works everywhere, RTL-safe) and **share card image** (for X/Instagram stories).
- Text format example (Western digits; Arabic-Indic option in settings):

```
تقريباً #12 🎯
النتيجة: 1.94× · أفضل من 92% من اللاعبين
🟩 ⬇️ 1.45×
🟧 ⬆️ 2.18×
🟧 ⬇️ 2.30×
(رابط اللعبة)
```
  - ⬇️ = your guess was too low, ⬆️ = too high. **No answers and no question text are revealed** in the share text, to avoid spoilers.
- Web Share API on mobile; fallback to copy.

### 6.5 Streaks [Our call]
- A streak = consecutive puzzle days with the puzzle **completed** (all 3 questions). Archive plays don't count.
- Optionally one "freeze" per week later (not v1).

---

## 7. Arabic and RTL requirements (summary)

Details and code are in `docs.md` §7–§9. Non-negotiables:

1. `<html lang="ar" dir="rtl">` everywhere; layout built with **CSS logical properties** (never `left/right`).
2. **Numbers stay left-to-right internally** (wrap in `<bdi dir="ltr">`), e.g. `1.45×`, `1,245`, even inside Arabic sentences.
3. **Digit style toggle:** Western (`0–9`, **default**, clearer for big numbers) vs Arabic-Indic (`٠–٩`). **The input accepts both** and normalizes.
4. Number words in input: «ألف، مليون، مليار، تريليون».
5. Good Arabic fonts (IBM Plex Sans Arabic / Cairo / Tajawal for UI; one display face for the logo), generous line-height (≥1.6), **no letter-spacing**, no italics, no all-caps logic.
6. Direction-aware icons (arrows, chevrons) mirror in RTL; the **log-scale number line stays low → high left-to-right** [Our call, to confirm in user testing, see §11].
7. Share text and image must render correctly in WhatsApp and X in RTL.
8. Test on real Arabic phones (Android Chrome + iOS Safari), not just desktop.

---

## 8. Content strategy (the real work)

Code is a weekend. **Questions are the product.** Plan for a daily treadmill.

### 8.1 What makes a good question
- **Answer is a single positive number** with a clear unit and a clear time frame ("per year", "as of 2025").
- **Verifiable** from a citable source (official statistics, FAO, airport authority, university facts, company reports). Every question stores `source_url` and `as_of` date.
- **Guessable by reasoning**, not trivia you either know or don't (the "napkin math" must exist).
- **Culturally relevant and broad:** mix **universal (1/3)**, **Arab-world regional (1/3)**, and **local / campus (1/3)**. Rotate countries (Gulf, Levant, Egypt, Maghreb) so everyone sees their own region.
- **Safe:** avoid politically divisive topics and religious rulings; factual cultural/economic/science topics are fine.
- **Calibrated:** Q1 easy (typical player lands within ~2–3×), Q2 medium, Q3 hard (typical miss 10×+). We tune with real data (median multiple per question).

### 8.2 Authoring format
Each question is written in Arabic with: text, unit, answer (+display), as-of date, source, napkin-math steps (Arabic), category, region, difficulty. See the template in `docs.md` §12.

### 8.3 Pipeline
1. Keep a backlog **≥ 30 questions ahead** before launch (so no daily panic).
2. Draft → fact-check against source → second person reviews → schedule on a date.
3. User submissions go to a queue with status: `new → reviewing → accepted/rejected → scheduled`. Credit the submitter by name/handle if they want.
4. After each puzzle, look at the actual guess distribution to calibrate future difficulty.

### 8.4 Seed ideas (topics only, **no answers claimed**, each needs sourcing before use)
- كم عدد الركاب الذين يمرّون بمطار حمد الدولي سنوياً؟
- كم عدد الطلاب المسجّلين في جامعة قطر؟
- كم عدد الرحلات الجوية اليومية في مطار دبي الدولي؟
- كم طن تمر تنتجه المملكة العربية السعودية سنوياً؟
- كم عدد درجات السلم في برج خليفة؟
- كم عدد المقاعد في استاد لوسيل؟
- كم عدد الجمال في دولة قطر؟
- كم لتراً من مياه البحر تُحلّى يومياً في المنطقة؟
- كم عدد الكتب في دار الكتب / المكتبة الوطنية؟
- كم عدد الحروف المطبوعة في كتاب من 300 صفحة؟ (تقدير بحت من حسابات الورقة)
- كم عدد خطوات المشي بين مبنيين في الحرم الجامعي؟ (محلي، نقيسه فعلياً)
- كم كوب قهوة عربية يُقدَّم في الأسبوع في كل مجلس؟ (مرشّح للمحتوى المحلي، يحتاج مصدراً أو قياساً)

---

## 9. Copy deck (starter Arabic UI strings)

| Key | Arabic |
|---|---|
| tagline | ثلاثة أسئلة مستحيلة. تخمينة واحدة لكل سؤال. الأقرب يفوز. |
| play | العب اليوم |
| how_to_play | كيف تلعب؟ |
| step1 | خمّن بأفضل ما عندك: بدون بحث على الإنترنت، فقط حساب على الورقة وحدس وآلة حاسبة عند الحاجة. |
| step2 | شاهد كم كنت قريباً: نكشف الإجابة ونقيس بُعدك عنها كمضاعف (×). |
| step3 | قارن مع أصدقائك: نتيجتك اليوم وترتيبك بين اللاعبين، وشاركها. |
| lock_in | ثبّت إجابتك |
| your_guess | خمّنت |
| answer | الإجابة |
| too_low | أقل من الإجابة بـ {x}× |
| too_high | أكثر من الإجابة بـ {x}× |
| closer_than | أقرب من {p}% من اللاعبين |
| how_everyone | كيف خمّن الجميع |
| napkin | حساب على الورقة |
| next_q | السؤال التالي |
| see_result | شاهد نتيجتك |
| daily_score | نتيجة اليوم |
| top_pct | أفضل {p}% |
| share | شارك نتيجتك |
| copy_text | انسخ النص |
| leaderboard | المتصدرون |
| my_group | مجموعتي |
| archive | الأرشيف |
| submit_q | اقترح سؤالاً |
| next_puzzle_in | اللغز القادم بعد {t} |
| not_enough | لا يوجد عدد كافٍ من اللاعبين بعد |
| invalid_guess | أدخل رقماً أكبر من صفر |
| what_is_fermi | ما هو سؤال فيرمي؟ |

The "What is a Fermi question?" blurb: write it in our own words (explain Enrico Fermi's estimation technique briefly). Don't copy Fermi's text.

---

## 10. Metrics (what "working" means)

Track from day one (privacy-friendly analytics, no ad trackers):
- **Activation:** % of visitors who lock in Q1; % who finish all 3.
- **Retention:** D1 / D3 / D7 return rate (the Wordle-habit signal).
- **Virality:** % of finishers who tap share; players per group; invites per group.
- **Quality:** median multiple per question (difficulty calibration), time to complete, drop-off per question.
- **Content health:** questions in backlog, submissions per week.

Suggested **university-launch success bar** (our targets, adjust freely): 50+ players in week 1, ≥ 30% D3 retention, ≥ 20% share rate among finishers, ≥ 5 active groups.

---

## 11. Roadmap

### Phase 0, setup (1–2 days)
- [ ] Pick name + domain; repo; Next.js + Tailwind + Supabase project (see `docs.md`).
- [ ] Fonts, RTL base layout, design tokens (colours, spacing), dark mode.
- [ ] Write **30 questions** (with sources and napkin math).

### Phase 1, MVP playable (≈ 1 weekend)
- [ ] Home, question, reveal, results screens (Arabic, RTL, mobile-first).
- [ ] Number input parser (Western + Arabic-Indic digits, number words).
- [ ] Server-side guess submission + scoring (answers hidden until locked).
- [ ] Built-in calculator.
- [ ] Copy-text share.
- [ ] Anonymous identity + progress resume.
- **Definition of done:** your friends can play today's puzzle on their phones, and get their score and a copyable result.

### Phase 2, social (≈ 1 week)
- [ ] Per-question percentile + daily "Top %" + log-scale distribution charts.
- [ ] Display name, university tag.
- [ ] Leaderboards (today / week / all-time / university).
- [ ] **Groups with invite links** + group leaderboard with spoiler protection.
- [ ] Streaks + profile/stats.

### Phase 3, polish and growth
- [ ] Share-card image generator (Arabic text rendering must be tested, see risks).
- [ ] Archive.
- [ ] Question submission + moderation queue.
- [ ] PWA install, offline shell, countdown timer.
- [ ] Analytics + admin view for question calibration.

### Phase 4, launch
- [ ] Soft launch to your university groups; collect feedback for a week.
- [ ] Fix confusing copy / RTL bugs found on real phones.
- [ ] Then X, Reddit, WhatsApp communities, student societies (Qatar University AI Organization is a natural first channel).

---

## 12. Risks and open decisions

**Risks**
1. **Content treadmill:** a daily puzzle needs ~90 vetted questions per quarter. Mitigate with a 30-question buffer, submissions, and seasonal batches.
2. **Stickiness:** one HN commenter said an earlier Fermi game wasn't addictive like Wordle. Our mitigations are the percentile reveal, the share card, streaks and **groups** (social pressure is the stickiest loop).
3. **Arabic share image:** some server-side image tools (e.g. Satori / `@vercel/og`) have had weak support for Arabic shaping and RTL. Test early; fallback is rendering the card from HTML with a headless browser or client-side `html-to-image`. Copy-text works regardless.
4. **Data accuracy for the Arab world:** official stats can be sparse or out of date. Always store `as_of` and `source_url`; prefer questions with solid public sources.
5. **Honor system:** people can Google. That's accepted (same as Fermi); we just never leak answers ahead of time and we don't over-police.
6. **Low-N percentiles** at launch look silly with 3 players. Hence the minimum-N rule.
7. **Time zone fairness:** UTC+3 midnight is fine for the Gulf/Levant/East Africa, early for Morocco/Algeria (UTC+0/+1). Acceptable for v1.

**Open decisions (need your call)**
- [ ] Final name + domain.
- [ ] Default digit style: Western (our proposal) or Arabic-Indic?
- [ ] Log-scale axis direction in RTL: keep low→high left-to-right (proposed) or mirror it?
- [ ] Do archive plays count toward streaks/leaderboards? (Proposed: stats yes, streaks/leaderboards no.)
- [ ] Do we allow English UI later?
- [ ] Open-source the code? (Could attract contributors for questions.)

---

## 13. First-week checklist (so you start today)

1. Decide the name (even a temporary one) and register the domain later.
2. Create the repo + Supabase project, set up RTL Tailwind and the Arabic font (`docs.md` §2, §7–§8).
3. Write the first 10 questions with sources.
4. Build the question → reveal → results flow with hard-coded data first.
5. Wire the real scoring functions (`docs.md` §5) and test them against the Fermi example (1.45 / 2.18 / 2.30 → **1.94**).
6. Send the link to 5 friends. Watch them play on their phones. Fix the first 10 things that confuse them.
