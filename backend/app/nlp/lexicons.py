"""Small, transparent linguistic lexicons used by the rule-based parts of the NLP pipeline.

These are intentionally compact and human-readable so every signal can be audited. They are
heuristics, not ground truth: a sensational phrase does not make an article false.
"""

STOPWORDS = frozenset(
    """a about above after again against all am an and any are aren't as at be because been before being below
    between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few
    for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him
    himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my
    myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll
    she's should shouldn't so some such than that that's the their theirs them themselves then there there's these
    they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're
    we've were weren't what what's when when's where where's which while who who's whom why why's with won't would
    wouldn't you you'd you'll you're you've your yours yourself yourselves also just said says say will one two""".split()
)

POSITIVE_WORDS = frozenset(
    """good great excellent positive fortunate correct improve improved improvement benefit beneficial success
    successful win winning wins best better progress hope hopeful happy glad pleased support supported strong
    stable safe safety secure gain gains growth grow rising recovery recover effective effectively reliable honest
    fair helpful peace peaceful agree agreement approve approved confirm confirmed celebrate achievement achieve
    achieved breakthrough boost brilliant calm clear encouraging favorable healthy increase launch praise rescue
    resolved victory welcome thrive improvement""".split()
)

NEGATIVE_WORDS = frozenset(
    """bad terrible horrible awful negative disaster disastrous crisis catastrophe catastrophic collapse crash fail
    failed failure failing fraud scam lie lies lying liar corrupt corruption scandal attack attacked threat
    threaten dangerous danger deadly death dead die kill killed killing murder violence violent war fear afraid
    panic chaos destroy destroyed destruction ruin ruined harm harmful toxic poison poisoned hoax conspiracy
    cover-up coverup shocking outrage outraged furious anger angry hate hatred evil criminal crime guilty betray
    betrayal traitor treason disgrace disgusting shameful pathetic stupid idiot insane cruel brutal slaughter
    sick disease epidemic plague victim victims suffer suffering abuse abused abuser steal stolen theft rigged
    sinister dire alarming appalling devastating""".split()
)

EMOTIVE_WORDS = frozenset(
    """shocking outrage outraged furious horrifying horrific terrifying disgusting devastating heartbreaking
    unbelievable incredible insane explosive bombshell stunning stunned scandalous sinister evil traitor
    traitors destroyed slammed blasts erupts erupt fury rage panic chaos nightmare apocalypse apocalyptic
    sickening appalling atrocious despicable heartless ruthless vicious brutal wicked disgraceful betrayal
    outrageous alarming shameful terrifies horrified fearful hysteria meltdown""".split()
)

SUBJECTIVE_WORDS = frozenset(
    """believe think feel feels felt seems seem apparently obviously clearly surely certainly honestly frankly
    personally opinion amazing awful beautiful ugly terrible wonderful horrible fantastic best worst greatest
    incredible unbelievable disgusting shameful outrageous ridiculous absurd pathetic brilliant stupid insane
    unfortunately fortunately hopefully sadly shockingly obviously undeniably blatantly utterly totally
    absolutely completely""".split()
)

HEDGING_WORDS = frozenset(
    """may might could possibly perhaps reportedly allegedly appears appear suggests suggest suggested likely
    unlikely probably estimated approximately roughly around about nearly apparently according preliminary""".split()
)

ABSOLUTIST_WORDS = frozenset(
    """always never everyone everybody nobody nothing everything all none totally completely absolutely
    undeniable undeniably proven proves guaranteed guarantee definitely certainly 100% entirely impossible
    every""".split()
)

INTENSIFIERS = frozenset(
    """very extremely incredibly absolutely totally utterly completely entirely highly deeply hugely massively
    insanely truly really so""".split()
)

FIRST_SECOND_PERSON = frozenset("i me my mine we us our ours you your yours".split())

ATTRIBUTION_PATTERNS = [
    r"\baccording to\b",
    r"\b(?:said|says|stated|told|announced|confirmed|reported|reports|noted|added|explained|testified) ",
    r"\bin a statement\b",
    r"\bspokesperson\b",
    r"\bofficials? (?:said|say|confirmed)\b",
    r"\bresearchers? (?:found|said|say|reported)\b",
    r"\b(?:study|survey|report|data) (?:published|found|shows|showed|from|by)\b",
    r"\bpublished in\b",
]

# Phrases frequently found in sensational / manipulative / clickbait text. Matching is case-insensitive.
SUSPICIOUS_PHRASES = [
    ("you won't believe", "clickbait"),
    ("you will not believe", "clickbait"),
    ("what happens next", "clickbait"),
    ("doctors hate", "clickbait"),
    ("this one weird trick", "clickbait"),
    ("will shock you", "clickbait"),
    ("goes viral", "clickbait"),
    ("share before it's deleted", "urgency"),
    ("share before it is deleted", "urgency"),
    ("before it gets deleted", "urgency"),
    ("they don't want you to know", "conspiratorial framing"),
    ("they do not want you to know", "conspiratorial framing"),
    ("what they're hiding", "conspiratorial framing"),
    ("what the media won't tell you", "conspiratorial framing"),
    ("mainstream media won't", "conspiratorial framing"),
    ("mainstream media is hiding", "conspiratorial framing"),
    ("wake up", "emotional appeal"),
    ("wake up, people", "emotional appeal"),
    ("sheeple", "emotional appeal"),
    ("cover-up", "conspiratorial framing"),
    ("cover up", "conspiratorial framing"),
    ("secret plan", "conspiratorial framing"),
    ("hidden agenda", "conspiratorial framing"),
    ("globalist", "loaded language"),
    ("deep state", "loaded language"),
    ("crisis actors", "conspiratorial framing"),
    ("miracle cure", "unsupported claim"),
    ("cures cancer", "unsupported claim"),
    ("100% proof", "unsupported claim"),
    ("100 percent proof", "unsupported claim"),
    ("proven fact", "overclaiming"),
    ("undeniable proof", "overclaiming"),
    ("irrefutable evidence", "overclaiming"),
    ("scientists are baffled", "clickbait"),
    ("breaking:", "urgency"),
    ("bombshell", "sensational wording"),
    ("explosive", "sensational wording"),
    ("shocking truth", "sensational wording"),
    ("the truth about", "sensational wording"),
    ("destroyed", "sensational wording"),
    ("slams", "sensational wording"),
    ("exposed", "sensational wording"),
    ("anonymous source", "weak sourcing"),
    ("sources say", "weak sourcing"),
    ("insiders say", "weak sourcing"),
    ("people are saying", "weak sourcing"),
    ("many people are saying", "weak sourcing"),
    ("experts agree", "weak sourcing"),
    ("everyone knows", "overclaiming"),
    ("it is obvious that", "overclaiming"),
    ("mind-blowing", "sensational wording"),
    ("must see", "clickbait"),
    ("must read", "clickbait"),
    ("the government is lying", "conspiratorial framing"),
    ("false flag", "conspiratorial framing"),
    ("plandemic", "conspiratorial framing"),
    ("big pharma", "loaded language"),
    ("wake the hell up", "emotional appeal"),
    ("act now", "urgency"),
    ("urgent warning", "urgency"),
    ("urgent:", "urgency"),
    ("alert:", "urgency"),
    ("don't let them", "emotional appeal"),
]

CLICKBAIT_TITLE_PATTERNS = [
    r"^\d+ (?:things|reasons|ways|facts|secrets|signs)\b",
    r"\byou (?:won'?t|will not|need to|have to) (?:believe|see|know)\b",
    r"\bwhat happens next\b",
    r"\bthis is why\b",
    r"\bhere'?s why\b",
    r"\bshocking\b",
    r"\bbreaking\b",
    r"\bexposed\b",
    r"\bthe truth\b",
]

NEGATION_CUES = frozenset(
    """not no never none nobody nothing neither nor cannot without n't hardly debunked false myth hoax""".split()
)

CAUSAL_CUES = ["causes", "cause ", "caused", "leads to", "led to", "results in", "linked to", "responsible for", "because of", "due to"]
