# Content brief: casual rewrite (2026-10-31)

Binding instructions for the writers replacing 52 questions in puzzles 3-39. Read `content/README.md` (format, style, checklist) first. The owner's feedback: questions are too complex and too detailed. **We want casual questions that a player can work out on a napkin, not guess blindly, and not just do arithmetic on numbers we hand them.**

## What we want
A casual question about something everyday or funny, where the player **reasons their way** to a guess in 2-3 steps using things they already have a feel for (how big a phone is, how long a football match lasts, how much a person weighs, how far Doha is from Dubai).

Good:
- «كم هاتفاً ذكياً تضعها طرفاً لطرف لتغطي طول ملعب كرة قدم؟» (phone ~15 cm, pitch ~105 m: the player can build it)
- «كم مرة تمضغ خلال وجبة غداء واحدة؟»
- «كم حبة أرز في صحن مجبوس واحد؟»
- «كم سنة تحتاج لعدّ مليون حبة رمل، حبة كل ثانية، 8 ساعات يومياً؟»

Bad (the reasons the old questions are being replaced):
- **Trivia you either know or throw:** needs a fact nobody has a feel for (how many dugongs live in Qatar, Riyadh metro's average speed, the Titanic's coal use, the Statue of Liberty's copper thickness).
- **Too detailed:** the question hands over 3+ numbers and the player only does arithmetic (columns × heights, dimensions × density, 8 h × 5 km/h × rest days).
- **Technical/physics:** energy in petrol, helium lift, lightning energy, boiling water with sunlight, haploid genomes.
- **Complex campus questions:** QU tuition, number of QU students × fares × days. Campus questions are allowed but rare: at most 2 in your batch, simple and funny.

## Rules
- **At most one number given in the question**, and only if the player could not reasonably estimate it. Prefer zero.
- **Short:** at most ~20 words of clear, friendly MSA. Western digits. No dialect. A little humour is welcome.
- **Answer:** one positive number ≤ 100,000,000, rounded to 2 significant figures. Everyday unit (`unit_ar`: a count of the thing, ريال قطري, دقيقة/ساعة/يوم/سنة, متر/كيلومتر, كيلوغرام, لتر). Never طن، متر مكعب، نسمة.
- **Difficulty by position:** `position: 1` easy (difficulty 1-2, most players within 2-3x). `position: 2` medium (difficulty 3). `position: 3` a bit harder (difficulty 4) but still casual: a longer chain, not obscure facts.
- **Factual and sourced:** every input comes from a real, reputable page you actually opened (WebSearch + WebFetch). Compute the answer from those inputs. Never invent numbers. `source_url` = the page for the most important input; other sources go in the notes.
- **Napkin math** (`## الحساب على الورقة`): 3-5 numbered steps, simple MSA, friendly rounded numbers, lands within ~2x of the answer.
- **Any topic, any region, no structure.** `region`: universal | gulf | levant | egypt | maghreb | qatar | campus. `category`: one of `agriculture architecture aviation body construction culture demographics education energy food industry media nature shipping space sports tourism trade transport water`.
- **No near-duplicates** of the kept questions below, of each other, or of the old question you replace. Avoid more Moon/Sun travel, Burj Khalifa stacking, Olympic pools, and blinks/heartbeats/breaths (already used).
- Respectful: no politics, conflict, religious rulings or private people. Nothing copied from fermi.gg.

## File format
Overwrite the file at the exact path you were given, keeping `puzzle` and `position` unchanged:

```
---
puzzle: 12
position: 1
category: food
region: universal
difficulty: 2
unit_ar: حبة
answer: 2400
as_of: "2026"
source_url: https://…
source_name: "Publisher - page"
---
## السؤال
…

## الحساب على الورقة
1. …
2. …
3. …

## ملاحظات للمحرر
- المدخلات: value - "exact quote" - URL (one line per input)
- الحساب: …
```

## Process
1. Write your files. Touch no other file, do not commit, do not touch the database.
2. Run `npm run import -- --dry-run` from the repo root and fix anything it reports for your files.
3. Reply with a table: file, question text, answer + unit, one-line source.

## Kept questions (do not duplicate)
- p001-q1: كم مرة ترمش عيناك خلال سنة كاملة (365 يوماً)، إذا كنت مستيقظاً 16 ساعة كل يوم؟ 
- p001-q2: كم تمرة مجدول تزن مجتمعةً بقدر جمل عربي ذكر بالغ؟ 
- p001-q3: كم يوماً متواصلاً، بلا نوم، يحتاج شخص واحد ليحضر كل محاضرات طلاب جامعة قطر في أسبوع واحد؟ (افترض 15 ساعة لكل طالب) 
- p002-q1: كم دقيقة تحتاج لتقطع طول كورنيش الدوحة 10 مرات سيراً على الأقدام بسرعة المشي العادية؟ 
- p002-q2: كم كرة قدم (مقاس 5) تملأ حوض سباحة أولمبياً سعته 2.5 مليون لتر، إذا رُصّت الكرات عشوائياً داخله؟ 
- p002-q3: كم زيتونة تلزم لإنتاج زيت الزيتون الذي تستهلكه عائلة لبنانية من 5 أفراد خلال سنة، بحسب متوسط استهلاك الفرد في لبنان؟ 
- p004-q1: كم قطعة ليغو قياسية (دون النتوءات) تُرصّ فوق بعضها لتبلغ ارتفاع قمة إيفرست؟ 
- p004-q2: كم كأساً من الشاي المغربي بالنعناع تحضّر من كيلوغرام من الشاي الأخضر، إذا وضعت 4 ملاعق صغيرة منه في كل إبريق يملأ 7 كؤوس؟ 
- p004-q3: كم ملعب كرة قدم بمقاس فيفا الموصى به يلزم لتغطية مساحة دولة قطر كلها، بلا فراغات؟ 
- p005-q2: كم كلمة ينطقها طالب جامعي متوسط خلال فصل دراسي مدته 105 أيام (15 أسبوعاً)؟ 
- p006-q1: كم كرة فلافل بحجم كرة تنس الطاولة تُصفّ في خط واحد لتغطي طول الطريق بين بيروت ودمشق؟ 
- p006-q2: كم قطار مترو من ذوات العربات الست يلزم لنقل جمهور ملعب لوسيل كله لو امتلأ؟ 
- p006-q3: لو كان هناك طريق مستقيم إلى القمر، كم يوماً تحتاج للوصول إليه مشياً بسرعة المشي المعتادة، إذا مشيت 8 ساعات يومياً؟ 
- p007-q1: كم ضغطة مفتاح تحتاجها لكتابة مقال إنجليزي من 2,000 كلمة، مع احتساب المسافات بين الكلمات؟ 
- p007-q2: لو صُهر قناع توت عنخ آمون الذهبي، فكم خاتم زواج نسائياً عادياً يمكن صنعه منه؟ 
- p008-q1: كم ورقة A4 تلزم لتغطية أرض ملعب كرة قدم بمقاس فيفا الموصى به تغطية كاملة، دون تداخل؟ 
- p008-q2: كم شعرة تتساقط طبيعياً من رأسك خلال أربع سنوات من الدراسة الجامعية (1,460 يوماً)؟ 
- p009-q1: كم جملاً ذكراً بالغاً، واقفاً بعضها فوق بعض، يلزم لتبلغ ارتفاع برج خليفة في دبي؟ 
- p009-q2: لو رُصّت حاويات الشحن التي بُني بها استاد 974 فوق بعضها في عمود واحد، فكم متراً يبلغ ارتفاعه؟ 
- p009-q3: كم حوضاً أولمبياً (سعته 2.5 مليون لتر) يتسع للدم الذي يضخه قلب إنسان خلال 100 سنة، لو جُمع كله؟ 
- p010-q1: كم مرة ينبض قلبك وأنت جالس تتفرج على مباراة كرة قدم مدتها 90 دقيقة؟ 
- p010-q2: ملأنا حوض استحمام سعته 200 لتر بماء البحر الميت. كم كيلوغراماً من الملح يحتويه الحوض تقريباً؟ 
- p010-q3: كم صقراً حراً ذكراً يعادل وزنه وزن ثلاث سيارات تويوتا لاند كروزر؟ 
- p013-q1: كم زجاجة ماء سعتها 1.5 لتر يملؤها ماء دش متوسط (نحو 8 دقائق) تأخذه كل يوم طوال سنة؟ 
- p013-q3: كم حبة رمل تملأ دلواً سعته 5 لترات من رمال الصحراء القطرية، إذا كان قطر الحبة نحو نصف مليمتر؟ 
- p014-q1: لو أمسك سكان جزيرة اللؤلؤة في الدوحة (نحو 52,000) بأيدي بعضهم في صف واحد، ممدودي الذراعين، فكم كيلومتراً يبلغ طول الصف؟ 
- p014-q2: كم نحلة عاملة تلزم، طوال حياتها كلها، لإنتاج العسل الذي تتناوله إذا أكلت ملعقتي عسل صغيرتين كل يوم لمدة سنة؟ 
- p015-q2: كم كلمة يكتبها طالب بخط يده لو كتب بلا توقف في 6 امتحانات نهائية، مدة كل منها ساعتان؟ 
- p015-q3: طلب مخترع الشطرنج حبة أرز في المربع الأول وضعفها في كل مربع تالٍ. كم كيلوغراماً تزن حبوب أول 30 مربعاً؟ (حبة الأرز 25 ملغ) 
- p016-q1: كم ساعة تقضيها في تفريش أسنانك خلال 70 سنة، إذا التزمت بالتوصية الصحية لمرات التفريش ومدته؟ 
- p017-q2: كم علبة مشروب غازي سعتها 330 مل يعادل ما يشربه فيل أفريقي بالغ من الماء خلال أسبوع؟ 
- p019-q1: إذا شربت علبة كولا واحدة (330 مل) كل يوم لمدة 10 سنوات، فكم مكعب سكر (4 غرامات للمكعب) يعادل سكرها؟ 
- p019-q2: كم دورة كاملة تدورها عجلة قطرها 90 سم خلال رحلة قطار من القاهرة إلى أسوان بالسكة الحديدية؟ 
- p020-q1: كم برجاً بحجم برج أسباير في الدوحة يلزم رصّها فوق بعضها لتبلغ حافة الفضاء على ارتفاع 100 كيلومتر؟ 
- p021-q2: كم كرة بادل تغطي أرض ملعب بادل قياسي بطبقة واحدة، إذا رُصّت الكرات في صفوف مستقيمة متلاصقة؟ 
- p021-q3: كم سنة تحتاج لقراءة كل كلمات ويكيبيديا الإنجليزية، دون نوم أو توقف، بسرعة قراءة عادية للبالغين؟ 
- p022-q1: لو وُجد طريق إلى الشمس، كم سنة تحتاج سيارة تسير بسرعة 100 كم/ساعة دون أي توقف لتصل إليها؟ 
- p023-q1: كم يوماً يحتاج كسلان ليقطع 100 كيلومتر على الأرض بأقصى سرعته، إن مشى ساعتين فقط كل يوم؟ 
- p023-q2: كم صورة ثابتة (إطاراً) تمرّ أمام عينيك لو شاهدت أفلام هاري بوتر الثمانية كاملةً في السينما؟ 
- p024-q1: على سارية ضخمة في العقبة علم مقاسه 30 × 60 م. كم منشفة حمام مقاسها 70 × 140 سم تلزم لتغطيته؟ 
- p024-q2: كم ومضة برق تحدث على كوكب الأرض كله خلال مباراة كرة قدم مدتها 90 دقيقة؟ 
- p025-q1: يأكل زوار ويمبلدون نحو 28,000 كغ من الفراولة خلال البطولة. كم كرة تنس تزن بقدر هذه الفراولة كلها؟ 
- p026-q1: كم ساعة تنام قطة منزلية في 10 سنوات؟ 
- p026-q2: كم كوكباً بحجم الأرض يتسع داخل الشمس لو ملأناها بكرات أرضية متراصّة دون فراغات؟ 
- p027-q2: أنهى الفائز بطواف فرنسا 2025 السباق في نحو 76 ساعة. لو أدار الدواسة 90 دورة في الدقيقة طوال ذلك، فكم دورة دواسة دارها؟ 
- p027-q3: كم دجاجة بياضة تلزم لتضع خلال سنة كاملة بيضاً يزن بقدر فيل أفريقي ذكر بالغ؟ 
- p028-q1: وجدت دراسة أن الشخص يستخدم هاتفه نحو 5 ساعات يومياً. كم يوماً كاملاً (24 ساعة) سيقضي على هاتفه خلال 50 سنة؟ 
- p028-q2: أسقط فريق 4,491,863 قطعة دومينو في سلسلة واحدة. كم يوماً يحتاج شخص لنصبها إذا نصب قطعة كل ثانية، 8 ساعات يومياً؟ 
- p029-q3: كم يوماً يحتاج أكبر حوت أزرق ليأكل من الكريل ما يعادل وزن جسمه كله؟ 
- p030-q1: يُصنع في العالم نحو 14 مليار قلم رصاص سنوياً، طول كل منها 19 سم. كم كيلومتراً طولها لو صُفّت طرفاً لطرف؟ 
- p030-q3: لو انتقل صوت انفجار على الشمس عبر الفضاء بسرعته في الهواء، كم سنة يستغرق ليصل إلى أذنك؟ 
- p031-q1: كسر العداء سابستيان ساوي حاجز الساعتين في الماراثون (42.195 كم) بزمن 1:59:30. بالسرعة نفسها، كم كيلومتراً يقطع في 24 ساعة؟ 
- p032-q1: كم يوماً تحتاج زرافة لتأكل نباتات بوزن سيارة صغيرة (1,500 كغ)؟ 
- p032-q2: تأكل بوينس آيرس نحو 14 مليون بيتزا سنوياً. لو رُصّت كلها جنباً إلى جنب، بقطر 36 سم للواحدة، فكم كيلومتراً يبلغ الصف؟ 
- p034-q1: كم متراً تنمو أظافر أصابع اليدين العشرة مجتمعةً خلال 80 سنة، لو لم تُقصّ أبداً؟ 
- p034-q2: واجهة الخزنة في البتراء عرضها 24 م وارتفاعها 37 م. كم بلاطة مقاس كل منها 30 × 30 سم تلزم لتغطيتها؟ 
- p034-q3: كم يوماً تحتاج لمشاهدة كل الفيديوهات التي تُرفع إلى يوتيوب في ساعة واحدة فقط، لو شاهدت 8 ساعات يومياً؟ 
- p035-q1: كم رفرفة يرفرفها جناحا طائر طنان صغير أثناء شربك كوب شاي مدة 5 دقائق؟ 
- p036-q1: وُصفت كنافة نابلس عام 2009 بأنها الأكبر في العالم، ووزنها 1,765 كغ. كم قطعة وزن كل منها 100 غ تُقطّع منها؟ 
- p036-q2: كم كيلوغراماً من أوراق الكينا يأكلها كوالا يعيش 15 سنة، لو أكل كل يوم أقصى ما يستطيع؟ 
- p037-q1: السلحفاة جوناثان، أكبر حيوان بري حي سناً، فقست نحو سنة 1832. كم يوماً عاشت حتى سنة 2026؟ 
- p037-q2: يستقبل برج إيفل نحو 7 ملايين زائر سنوياً. كم زائراً في الدقيقة لو فتح 12 ساعة يومياً طوال أيام السنة؟ 
- p038-q1: لو استطاعت طائرة ركاب سرعتها 900 كم/ساعة الطيران إلى القمر دون توقف، كم يوماً تحتاج؟ 
- p039-q1: تُنتج أم الحوت الأزرق نحو 220 كغ من الحليب يومياً. كم زجاجة سعة 1.5 لتر تملأ في أسبوع؟ (اعتبر كل كيلوغرام لتراً) 
- p039-q3: يأكل الإيطالي نحو 23.5 كغ معكرونة سنوياً. لو كانت كلها سباغيتي طولها 27.5 سم، فكم متراً من الخيوط يأكل في السنة؟ 
- p040-q1: يُباع نحو 17 ساندويتش «بيغ ماك» كل ثانية، ووزن الواحد نحو 220 غ. كم كيلوغراماً تزن البيغ ماك المباعة في يوم كامل؟ 
- p040-q2: طول سور الصين العظيم الكلي 21,196 كم، وبُني عليه حتى 25,000 برج مراقبة. كم متراً بين برجين متجاورين في المتوسط؟ 
- p040-q3: كم طائراً طناناً من أصغر الأنواع يعادل وزنه قلب حوت أزرق واحد؟ 
