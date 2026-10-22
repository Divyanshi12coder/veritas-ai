from app.nlp.preprocessing import (
    clean_text,
    count_syllables,
    remove_stopwords,
    split_sentences,
    stem_tokens,
    tfidf_preprocessor,
    tokenize,
)


def test_clean_text_strips_html_urls_and_whitespace():
    raw = "<p>Hello&nbsp;<b>world</b>  see https://example.com/x?y=1   now</p>"
    out = clean_text(raw)
    assert "<" not in out and "http" not in out
    assert "  " not in out
    assert out.startswith("Hello")


def test_clean_text_normalises_unicode_quotes_and_replacement_char():
    assert clean_text("Trump�s “plan”") == "Trump's \"plan\""


def test_agency_datelines_are_scrubbed_but_not_when_disabled():
    text = "WASHINGTON (Reuters) - The senate met on Tuesday."
    assert "Reuters" not in clean_text(text)
    assert clean_text(text).startswith("The senate")
    assert "Reuters" in clean_text(text, scrub_artifacts=False)


def test_tokenize_lowercases_and_keeps_numbers_and_contractions():
    assert tokenize("It's 12% UP, said Dr. Reyes") == ["it's", "12%", "up", "said", "dr", "reyes"]


def test_sentence_split_respects_abbreviations():
    s = split_sentences("Dr. Reyes spoke at 5 p.m. today. The U.S. Senate agreed! Did it pass? Yes.")
    assert s[0].startswith("Dr. Reyes")
    assert len(s) == 4


def test_stopword_removal_and_stemming():
    toks = remove_stopwords(tokenize("The researchers are studying the running studies"))
    assert "the" not in toks and "are" not in toks
    assert stem_tokens(["studies", "studying", "running"]) == ["studi", "studi", "run"]


def test_tfidf_preprocessor_lowercases():
    assert tfidf_preprocessor("Breaking NEWS") == "breaking news"


def test_syllable_counter_is_at_least_one():
    assert count_syllables("a") == 1
    assert count_syllables("misinformation") >= 4
