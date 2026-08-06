from app.services.recommendations import compatibility_score, recommend_for_profile
from app.services.search import smart_search


def test_complementary_professions_score_above_generic_match():
    musician = {
        "id": "a",
        "profession": "Musician",
        "industry": "Music",
        "services_needed": ["Photography"],
    }
    photographer = {
        "id": "b",
        "profession": "Photographer",
        "industry": "Music",
        "services_offered": ["Photography"],
        "rating_average": 4.8,
        "review_count": 7,
    }

    result = compatibility_score(musician, photographer)

    assert result["score"] >= 50
    assert any("service you need" in reason for reason in result["reasons"])


def test_recommendations_are_sorted_by_score():
    source = {"id": "source", "profession": "Developer", "services_needed": ["Design"]}
    candidates = [
        {"id": "low", "profession": "Accountant"},
        {"id": "high", "profession": "Designer", "services_offered": ["Design"]},
    ]

    results = recommend_for_profile(source, candidates)

    assert results[0]["profile"]["id"] == "high"


def test_smart_search_expands_natural_language_intent():
    profiles = [
        {"id": "1", "display_name": "Ava", "profession": "Developer", "skills": ["React"]},
        {"id": "2", "display_name": "Mina", "profession": "Chef", "skills": ["Menu"]},
    ]

    results = smart_search("Who can build my website?", profiles)

    assert results[0]["profile"]["profession"] == "Developer"
