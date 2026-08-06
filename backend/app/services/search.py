from __future__ import annotations

from typing import Any

from app.services.recommendations import graph_neighbors, normalize, terms

QUERY_INTENTS: dict[str, set[str]] = {
    "website": {"developer", "designer", "product manager"},
    "app": {"developer", "designer", "startup founder"},
    "music": {"musician", "producer", "recording engineer", "dj"},
    "photo": {"photographer", "videographer"},
    "investor": {"investor", "startup founder"},
    "mentor": {"mentor", "coach", "consultant"},
    "restaurant": {"restaurant owner", "chef", "food supplier"},
    "accountant": {"accountant", "bookkeeper", "tax advisor"},
    "hire": {"recruiter", "candidate", "employee"},
    "customers": {"buyer", "client", "customer"},
    "ai": {"ai engineer", "developer", "product manager"},
}


def expand_query(query: str) -> set[str]:
    query_terms = terms(query.replace("?", " ").split())
    expanded = set(query_terms)
    for token, related in QUERY_INTENTS.items():
        if token in query_terms or token in normalize(query):
            expanded.update(related)
            for profession in related:
                expanded.update(graph_neighbors(profession))
    return expanded


def searchable_terms(profile: dict[str, Any]) -> set[str]:
    combined = set()
    for field in [
        "profession",
        "industry",
        "business_name",
        "display_name",
        "skills",
        "services_offered",
        "services_needed",
        "goals",
        "interests",
        "languages",
        "causes",
    ]:
        combined.update(terms(profile.get(field)))
    for value in profile.get("social_links", {}).keys():
        combined.add(normalize(value))
    return combined


def smart_search(query: str, profiles: list[dict[str, Any]], limit: int = 20) -> list[dict[str, Any]]:
    expanded = expand_query(query)
    results: list[dict[str, Any]] = []
    for profile in profiles:
        if profile.get("privacy", {}).get("allow_search_indexing") is False:
            continue

        profile_terms = searchable_terms(profile)
        overlap = expanded.intersection(profile_terms)
        semantic_professions = graph_neighbors(profile.get("profession"))
        semantic_overlap = expanded.intersection(semantic_professions)
        score = min(100, len(overlap) * 12 + len(semantic_overlap) * 9)

        reasons = []
        if overlap:
            reasons.append(f"Matched profile context: {', '.join(sorted(overlap)[:4])}.")
        if semantic_overlap:
            reasons.append("Matched a complementary professional relationship.")
        if not reasons and normalize(query) in normalize(profile.get("biography")):
            score += 10
            reasons.append("Matched profile biography context.")

        if score > 0:
            results.append({"profile": profile, "score": round(score, 1), "reasons": reasons})

    return sorted(results, key=lambda item: item["score"], reverse=True)[:limit]
