from __future__ import annotations

from collections import defaultdict
from typing import Any

COMPLEMENTARY_GRAPH: dict[str, list[str]] = {
    "musician": [
        "producer",
        "recording engineer",
        "videographer",
        "photographer",
        "dj",
        "venue owner",
        "promoter",
        "graphic designer",
    ],
    "barber": [
        "photographer",
        "clothing brand",
        "tattoo artist",
        "influencer",
        "product supplier",
        "entrepreneur",
    ],
    "real estate agent": [
        "mortgage broker",
        "attorney",
        "inspector",
        "contractor",
        "photographer",
        "investor",
        "interior designer",
    ],
    "restaurant owner": [
        "chef",
        "food supplier",
        "marketing agency",
        "photographer",
        "influencer",
        "delivery partner",
    ],
    "developer": ["startup founder", "designer", "product manager", "investor"],
    "fitness coach": ["nutritionist", "physical therapist", "gym owner"],
}


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def terms(values: Any) -> set[str]:
    if values is None:
        return set()
    if isinstance(values, str):
        values = [values]
    return {normalize(value) for value in values if normalize(value)}


def graph_neighbors(profession: str) -> set[str]:
    profession = normalize(profession)
    neighbors = set(COMPLEMENTARY_GRAPH.get(profession, []))
    for source, targets in COMPLEMENTARY_GRAPH.items():
        if profession in targets:
            neighbors.add(source)
    return {normalize(item) for item in neighbors}


def service_overlap(source: dict[str, Any], candidate: dict[str, Any]) -> tuple[set[str], set[str]]:
    source_needs = terms(source.get("services_needed"))
    source_offers = terms(source.get("services_offered"))
    candidate_needs = terms(candidate.get("services_needed"))
    candidate_offers = terms(candidate.get("services_offered"))
    they_help_you = source_needs.intersection(candidate_offers)
    you_help_them = source_offers.intersection(candidate_needs)
    return they_help_you, you_help_them


def compatibility_score(source: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    score = 0.0
    reasons: list[str] = []
    shared_terms: dict[str, list[str]] = defaultdict(list)

    source_profession = normalize(source.get("profession"))
    candidate_profession = normalize(candidate.get("profession"))
    if candidate_profession and candidate_profession in graph_neighbors(source_profession):
        score += 28
        reasons.append(
            f"{candidate.get('profession')} complements your work as a {source.get('profession')}."
        )
    elif source_profession and source_profession == candidate_profession:
        score += 8
        reasons.append("You work in a similar profession and may share useful context.")

    same_industry = normalize(source.get("industry")) == normalize(candidate.get("industry"))
    if normalize(source.get("industry")) and same_industry:
        score += 12
        reasons.append(f"You both work in the {source.get('industry')} industry.")

    they_help_you, you_help_them = service_overlap(source, candidate)
    if they_help_you:
        score += min(18, 9 + len(they_help_you) * 3)
        shared_terms["services_they_offer_you"] = sorted(they_help_you)
        reasons.append("They offer a service you need.")
    if you_help_them:
        score += min(18, 9 + len(you_help_them) * 3)
        shared_terms["services_you_offer_them"] = sorted(you_help_them)
        reasons.append("You offer a service they need.")

    for field, label, weight in [
        ("skills", "skills", 10),
        ("goals", "goals", 8),
        ("interests", "interests", 7),
        ("languages", "languages", 5),
        ("causes", "causes", 4),
    ]:
        overlap = terms(source.get(field)).intersection(terms(candidate.get(field)))
        if overlap:
            shared_terms[field] = sorted(overlap)
            score += min(weight, 2 + len(overlap) * 2)
            reasons.append(f"You share {label}: {', '.join(sorted(overlap)[:3])}.")

    mutual_connections = int(candidate.get("mutual_connections", 0) or 0)
    if mutual_connections:
        score += min(8, mutual_connections * 2)
        reasons.append("You have mutual connections.")

    rating = float(candidate.get("rating_average", 0) or 0)
    review_count = int(candidate.get("review_count", 0) or 0)
    if rating >= 4.5 and review_count >= 3:
        score += 5
        reasons.append("They have strong reviews from the community.")

    if candidate.get("recent_activity_score", 0):
        score += min(5, float(candidate["recent_activity_score"]))
        reasons.append("They have been active recently.")

    if not reasons:
        reasons.append("TapLex found a broad networking opportunity based on your profile context.")

    return {
        "profile": candidate,
        "score": round(min(score, 100), 1),
        "reasons": reasons[:6],
        "shared_terms": dict(shared_terms),
    }


def recommend_for_profile(
    source: dict[str, Any], candidates: list[dict[str, Any]], limit: int = 10
) -> list[dict[str, Any]]:
    matches = [compatibility_score(source, candidate) for candidate in candidates]
    matches = [match for match in matches if match["profile"].get("id") != source.get("id")]
    return sorted(matches, key=lambda item: item["score"], reverse=True)[:limit]
