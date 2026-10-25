# ScamCheck GH — build brief (retention + detection)

Prepared 25 Oct 2026 (Africa/Accra) for the Nebius x NVIDIA Global AI Hackathon (deadline Fri 30 Oct 2026, 5 PM GMT).
Every LLM call: Nebius Token Factory, NVIDIA Nemotron. Facts below carry a source link; where evidence is thin it says so.

## 1. Is the problem frequent enough to come back to?

Yes. This is the strongest of the three apps for repeat use.

- Ghana: BoG 2025 Fraud Report — total fraud cases rose from 16,733 (2024) to 24,778 (2025); the PSP/mobile-money sector alone recorded 24,124 cases (+54%) and GH¢37m value at risk (+95%). Fraud is "migrating" to PSPs, linked to lower digital literacy. https://www.bog.gov.gh/wp-content/uploads/2026/07/FRAUD-REPORT-2025.pdf
- Ghana CSA: reported incidents rose from 1,317 (H1 2024) to 2,008 (H1 2025); online fraud = 36% of reports; GH¢14.9m losses in H1 2025, fraud and impersonation >94% of losses. https://moc.gov.gh/2025/09/03/minister-launches-2025-national-cyber-security-awareness-month-and-calls-for-safer-more-accountable-digital-space/
- Africa (GASA 2025, survey of Egypt, Kenya, Nigeria, South Africa — Ghana not surveyed): 15% of adults meet a scam daily, about 20% several times a week; SMS is the top channel (57%); 68% experienced a scam in 12 months; only 20% of those who lost money recovered any. https://thecfma.org/2026/03/10/africas-cybercrime-crisis-a-deep-dive-into-gasas-2025-state-of-scams-in-africa-report/
- Devices: Ghana Q4 2025 — 57.66% smartphones, 22.71% feature phones, 19.63% basic phones (NCA). About 42% of devices cannot run an app, so WhatsApp and USSD/SMS reach matters. https://nca.org.gh/wp-content/uploads/2026/06/Q4-2025-Statistical-Bulletin.pdf

Retention baseline to beat: utility apps average about 18.3% D1, 6.8% D7, 3.4% D30 (Statista via Sendbird). https://sendbird.com/blog/app-retention-benchmarks-broken-down-by-industry

Why tools like this get abandoned (evidence):
- False alarms reduce trust and intention to use warning apps. https://doi.org/10.1016/j.ssci.2024.106724
- Repeated warnings get habituated within weeks. https://www.cl.cam.ac.uk/events/shb/2017/vance2.pdf
- Vague verdicts: KSL's test found Scamio only ever said "likely suspicious" and missed most categories; screenshots often froze apps. https://www.ksl.com/article/news/ksl-investigates/we-tested4popularscamdetection-apps-hereswhatactually-worked/51589869
- A check-only tool is only used when you already suspect a scam (PCMag on Norton Genie). https://uk.pcmag.com/security/147918/norton-genie

## 2. Retention features (ranked by impact, then by how doable they are this week)

| # | Feature | Impact | Effort | Why / evidence |
|---|---------|--------|--------|----------------|
| 1 | Share to ScamCheck: an Android share target (PWA `share_target`), plus a paste and screenshot box | High | S | Removes copy-paste friction; installed PWAs appear in the Android share sheet. https://developer.chrome.com/docs/capabilities/web-apis/web-share-target |
| 2 | WhatsApp bot entry (forward the message to the bot, get the verdict card back) | High | M | Scamio runs on the web, WhatsApp, Messenger and Discord (https://www.bitdefender.com/en-us/consumer/scamio). Replies inside the 24h service window cost nothing until 1,000 per month; from 1 Oct 2026 each message beyond that is charged (https://developers.facebook.com/docs/whatsapp/pricing/). For the demo, a Meta test number is enough. |
| 3 | "Check for Mum": family protection. Link a relative; HIGH-risk checks they run (or forward) notify you, and you get a forwardable verdict card in English or Twi | High | S–M | Truecaller launched Family Protection in Dec 2025 (an admin can end a scam call remotely). https://corporate.truecaller.com/newsroom/press-release/CE48ACDE76C40843 |
| 4 | Ghana Scam Radar: a live feed of trending scam types and numbers, built from anonymised checks and reports, with a "this number was reported N times" badge | High | M | TrustGH's community number reports show demand. https://www.trustgh.com/ |
| 5 | One-tap escalate: prefilled report to CSA (call or text 292, WhatsApp 0501603111, report@csa.gov.gh) and MTN fraud (*170# → Report Fraud, mmfraudteam.GH@mtn.com) | Med–High | S | Only 20% of African victims recover funds, and 44% of non-reporters don't know whom to contact (GASA). https://csa.gov.gh/report · https://help-center.mtn.com.gh/hc/en-us/articles/4405588071314-How-do-I-report-Mobile-Money-MoMo-fraud |
| 6 | My Shield history: each check saved, a "scams dodged / GH¢ protected" counter, and 3-line explanations you can re-read | Medium | S | Gives a sense of progress; history is a Norton Genie pattern (PCMag). |
| 7 | Weekly WhatsApp digest: "3 scams trending in Ghana this week" plus a 30-second "spot the scam" quiz with a streak | Medium | S | Duolingo's streak work raised D14 retention by 3.3% in one test. https://blog.duolingo.com/improving-the-streak/ (from another domain; treat it as directional) |
| 8 | USSD / SMS fallback (text a message to a shortcode) | High reach | L | 42% of devices are feature or basic phones (NCA). Not buildable this week: show it as a roadmap mock. |

Note on SMS auto-scan: Google Play restricts READ_SMS to default SMS apps, with an anti-smishing exception that requires "a documented track record". Not viable this week; use the share target and WhatsApp instead. https://support.google.com/googleplay/android-developer/answer/10208820?hl=en

Show in the demo to prove stickiness: (1) share a screenshot from WhatsApp into ScamCheck, (2) the verdict card forwarded to "Mum" with an alert on her linked profile, (3) the Scam Radar showing the same number reported by other users, (4) the one-tap CSA 292 report.

## 3. Detection: state of the art for SMS, MoMo and WhatsApp scams

Ghana typologies to encode (MTN MoMo, Sept 2024): fake wrong transfers with fake SMS alerts; posing as MTN staff to "reverse" and get the PIN; promo scams; fake loan links asking for a Ghana Card; fake online vendors; e-cash liquidation; WhatsApp account takeover. MTN also notes fraudsters misspell words to beat its SMS filters. https://techfocus24.com/mtn-momo15-mml-educates-customers-about-common-fraud-tactics/
CSA rule set: never share the PIN; agents and telco staff never ask for it; wait for the confirmation SMS from the telco. https://csa.gov.gh/mobile_money_fraud.php

Research highlights:
- LLM vs classical: in PhishNet 2025, RoBERTa scored 92% and 100% on two datasets; GPT-OSS few-shot scored 94% and 92%. They are comparable, so LLM value is in explanations and robustness to new wording, not raw accuracy. https://doi.org/10.32604/cmc.2025.069491
- LLM smishing explainer (KorSmishing Explainer, EMNLP 2024 industry track): a country-specific smishing explainer built around local scam types, which is the template for a Ghana version. https://aclanthology.org/2024.emnlp-industry.47/
- Domain age: 57% of phishing domains were used within 14 days of registration (Interisle 2021), but more than 50% of phishing hosts in another sample were over a year old, so treat it as a signal, not a verdict. https://www.interisle-group.com/PhishingLandscape2021-ExecutiveSummary.pdf · https://circleid.com/posts/20211222-what-whois-history-reveals-about-3800-verified-phishing-hosts
- URL reputation: Safe Browsing Lookup v4 is free for non-commercial use, up to 500 URLs per request (https://developers.google.com/safe-browsing/v4/usage-limits). VirusTotal's public API allows 4 requests per minute and 500 per day, non-commercial only (https://docs.virustotal.com/reference/public-vs-premium-api).
- Calibrated confidence: sample-consistency calibration beats verbalised confidence. https://arxiv.org/html/2402.13904
- Tavily free tier: 1,000 credits per month; basic search = 1 credit, advanced = 2. Budget around 1 basic search per check. https://docs.tavily.com/documentation/api-credits

Model costs on Nebius Token Factory (catalog, 25 Oct 2026, per 1M input/output tokens): Nemotron-3-Nano-30B-A3B $0.06/$0.24; Nemotron-3.5-Lightning $0.06/$0.24; Nemotron-3-Super-120B $0.30/$0.90; Nemotron-3-Ultra-550B $1/$3; Nemotron-3.5-Super-VL $0.30/$0.90. https://tokenfactory.nebius.com/api/public/models_info (Ultra price from ModelBench listing)

### Beyond basic: upgrade list (effort S/M/L, judging impact)

1. **Deterministic pre-pass before any LLM call** (S, high Tech). Regex out GH phone numbers (+233/0XX), MoMo short codes (*170#, *110#), amounts in GH¢, URLs. Expand shorteners, normalise Unicode and punycode, and check lookalike brands (MTN, Telecel, AT, GCB, Ecobank, GRA, ECG) by edit distance. Check domain age via RDAP and Safe Browsing. This is free and fast, and it gives the LLM facts instead of guesses.
2. **Nemotron cascade with structured JSON** (S, high Tech plus a cost story). Lightning or Nano classifies, tags tactics (urgency, authority, secrecy, PIN or OTP request, advance fee, refund reversal) and extracts entities as JSON. Escalate to Super-120B only when confidence is below a threshold or the amount is above GH¢500; reserve Ultra for disputed cases. Log the cost per check in the UI.
3. **Ghana scam pattern library plus retrieval** (M, high Impact and Idea). Seed 40–80 labelled exemplars from MTN, CSA and BoG typologies. Retrieve the nearest 3 (BM25, or Qwen3-Embedding-8B, which is also on Nebius) as few-shot evidence, and show "Matches known pattern: Fake wrong transfer (MTN, 2024)".
4. **Evidence-grounded, cited verdict** (M, high Design and Tech). Run Tavily queries such as `"<number>" scam Ghana`, `<domain> scam`, plus a site filter on csa.gov.gh, bog.gov.gh and mtn.com.gh. A second Nemotron pass checks that each claim maps to a fetched snippet, drops unsupported citations, and says "no web evidence found" when that is the case.
5. **Calibrated risk score** (S, high Design). Combine a points table (pre-pass signals with fixed weights, shown to the user) with the agreement rate of 3 Lightning samples, mapped to SAFE / CAUTION / SCAM / CAN'T TELL. Never show a bare percentage without the reasons.
6. **Span-highlight explanations plus "what to do now"** (S, high Design). Highlight the exact phrases that triggered each tactic (as Norton Genie does) and give actions specific to Ghana: don't send, check the balance by dialling *170#, call 292.
7. **Conversation and screenshot mode** (M). Nemotron-3.5-Super-VL reads a multi-message WhatsApp screenshot; classify the trajectory, catching romance and job scams that "turn" mid-chat (the gap Google targets with conversational scam detection: https://blog.google/security/new-ai-powered-scam-detection-features/).
8. **Mini eval harness** (S, high credibility). Build 60 labelled messages (Ghana scam vs legit MTN, bank and OTP messages), report precision, recall and false-positive rate on stage, and show one false positive you fixed.

## 4. Competitor gaps we solve (with evidence) and how each fix scores

| Competitor gap (evidence) | Our fix | Tech (Nebius + Nemotron) | Design | Impact | Idea |
|---|---|---|---|---|---|
| **No Ghana coverage on Google's built-in detection**: Android Scam Detection's country list has no African country (https://support.google.com/android/answer/18633392?hl=en); Messages Scam Detection launched first in the US, UK and Canada (https://blog.google/security/new-ai-powered-scam-detection-features/) | Ghana-first typology library (MTN, CSA, BoG) and local next steps (292, *170#) | Nemotron few-shot or RAG on Ghana patterns | Local language and actions | Covers the PSP fraud surge (BoG) | First Ghana-specific LLM scam explainer |
| **Vague verdicts**: Scamio never stated with certainty that anything was a scam, only "likely suspicious", and missed most categories (KSL test); Genie often "not sure" (PCMag) | Calibrated score with visible evidence points plus self-consistency | Lightning ×3 sampling, Super escalation | Clear 4-band verdict with reasons | Fewer people left unsure | Transparent scoring |
| **False positives on real messages**: Google Messages flagged FAFSA and a user's mother as spam (https://www.reddit.com/r/GoogleMessages/comments/1jx4aae/false_spam_huge_send_button/, https://www.reddit.com/r/GooglePixel/comments/1opjodi/my_mothers_text_messages_to_me_keep_getting/); Trend Micro flagged a real Amazon order (KSL) | Allowlist of official sender IDs and short codes, a legit-message eval set, and a "Not a scam" feedback loop | Nemotron gets the allowlist facts as context | Trust | Fewer people ignoring alerts | Measured FP rate shown |
| **Screenshots break tools**: KSL says most apps struggled with images and screenshots often froze them | Vision path through Nemotron-3.5-Super-VL with OCR text plus URL extraction | VL model on Nebius | Share a screenshot straight in | WhatsApp-heavy users | Multimodal |
| **English-only or limited languages**: Genie "works only with English-language scams" (PCMag 2023) | English plus Twi summaries (test quality first; evidence on Nemotron's Twi is thin) | Nemotron generation | Familiar language | Older and less literate users | Localisation |
| **Privacy worries**: Truecaller faces POPIA complaints in South Africa and a suit in Kenya over contact data (https://mybroadband.co.za/news/smartphones/621928-truecaller-under-investigation-in-south-africa-2.html, https://nation.africa/kenya/news/truecaller-sued-in-kenya-over-privacy-violations-4784224) | No contacts access; mask the user's own number and PINs before LLM calls; delete raw text after 24h | PII redaction pre-pass before Nebius | Privacy note on the card | Trust in Ghana | Privacy by design |
| **Account wall or wrong channel**: Scamio needs a Bitdefender account (https://www.bitdefender.com/en-us/consumer/scamio); Whoscall Premium is only in TW, TH, JP, KR, MY and HK (https://appstoreprice.org/en/apps/929968679) | No-signup web app, WhatsApp bot, USSD on the roadmap | Same Nemotron backend for every channel | Low-friction | Reaches feature-phone users later | Omnichannel |
| **Check-only, no follow-through**: Scamio doesn't block or report (https://www.itechguides.com/products/bitdefender-scamio/) | One-tap CSA and MTN report, Scam Radar, family alert | Nemotron drafts the report text | Clear next step | Faster reporting | Closes the loop |

Top 3 gaps to pitch: (1) no Ghana coverage on Google's built-in scam detection, (2) vague "likely suspicious" verdicts, (3) false positives that make people ignore warnings.
