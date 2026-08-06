from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


def new_id() -> str:
    return uuid4().hex


def now_utc() -> datetime:
    return datetime.now(UTC)


class Location(BaseModel):
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_miles: int | None = Field(default=None, ge=1, le=100)
    is_public: bool = False


class PrivacySettings(BaseModel):
    profile_visibility: Literal["public", "connections", "private"] = "public"
    show_email: bool = False
    show_phone: bool = False
    show_location: bool = False
    allow_search_indexing: bool = True
    allow_ai_recommendations: bool = True


class ProfileBase(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9._-]+$")
    display_name: str = Field(min_length=1, max_length=120)
    business_name: str | None = Field(default=None, max_length=160)
    profession: str = Field(min_length=2, max_length=120)
    industry: str | None = Field(default=None, max_length=120)
    biography: str | None = Field(default=None, max_length=2000)
    profile_photo_url: HttpUrl | None = None
    cover_banner_url: HttpUrl | None = None
    skills: list[str] = Field(default_factory=list, max_length=50)
    services_offered: list[str] = Field(default_factory=list, max_length=50)
    services_needed: list[str] = Field(default_factory=list, max_length=50)
    goals: list[str] = Field(default_factory=list, max_length=30)
    experience: list[str] = Field(default_factory=list, max_length=30)
    education: list[str] = Field(default_factory=list, max_length=30)
    certifications: list[str] = Field(default_factory=list, max_length=30)
    website: HttpUrl | None = None
    portfolio: HttpUrl | None = None
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    social_links: dict[str, HttpUrl] = Field(default_factory=dict)
    business_hours: dict[str, str] = Field(default_factory=dict)
    appointment_links: list[HttpUrl] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    causes: list[str] = Field(default_factory=list)
    location: Location | None = None
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    custom_links: dict[str, HttpUrl] = Field(default_factory=dict)
    nfc_card_id: str | None = None

    @field_validator(
        "skills",
        "services_offered",
        "services_needed",
        "goals",
        "languages",
        "interests",
        "causes",
        mode="before",
    )
    @classmethod
    def clean_lists(cls, value):
        if value is None:
            return []
        cleaned = []
        for item in value:
            text = str(item).strip()
            if text and text.lower() not in {existing.lower() for existing in cleaned}:
                cleaned.append(text)
        return cleaned


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    business_name: str | None = Field(default=None, max_length=160)
    profession: str | None = Field(default=None, min_length=2, max_length=120)
    industry: str | None = Field(default=None, max_length=120)
    biography: str | None = Field(default=None, max_length=2000)
    skills: list[str] | None = None
    services_offered: list[str] | None = None
    services_needed: list[str] | None = None
    goals: list[str] | None = None
    privacy: PrivacySettings | None = None
    location: Location | None = None
    social_links: dict[str, HttpUrl] | None = None
    custom_links: dict[str, HttpUrl] | None = None


class Profile(ProfileBase):
    id: str = Field(default_factory=new_id)
    owner_uid: str
    verification_status: Literal["unverified", "pending", "verified"] = "unverified"
    achievements: list[str] = Field(default_factory=list)
    rating_average: float = Field(default=0, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    qr_code_url: HttpUrl | None = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class ConnectionRequest(BaseModel):
    target_profile_id: str
    message: str | None = Field(default=None, max_length=500)


class Connection(BaseModel):
    id: str = Field(default_factory=new_id)
    requester_uid: str
    target_profile_id: str
    status: Literal["pending", "accepted", "declined", "blocked"] = "pending"
    message: str | None = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class MessageCreate(BaseModel):
    recipient_uid: str
    body: str = Field(min_length=1, max_length=4000)
    inquiry_type: Literal["direct", "business", "connection"] = "direct"


class Message(BaseModel):
    id: str = Field(default_factory=new_id)
    sender_uid: str
    recipient_uid: str
    body: str
    inquiry_type: Literal["direct", "business", "connection"] = "direct"
    read_at: datetime | None = None
    report_status: Literal["none", "reported", "reviewed"] = "none"
    created_at: datetime = Field(default_factory=now_utc)


class CommunityPostCreate(BaseModel):
    post_type: Literal[
        "photo",
        "video",
        "project",
        "business_update",
        "hiring",
        "looking_for_work",
        "announcement",
        "event",
        "question",
        "article",
    ]
    body: str = Field(min_length=1, max_length=5000)
    media_urls: list[HttpUrl] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class MarketplaceListing(BaseModel):
    id: str = Field(default_factory=new_id)
    seller_uid: str
    listing_type: Literal["product", "service", "appointment", "course", "ticket", "event", "subscription"]
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=1, max_length=4000)
    price_cents: int = Field(default=0, ge=0)
    currency: str = Field(default="usd", min_length=3, max_length=3)
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class MarketplaceListingCreate(BaseModel):
    listing_type: Literal["product", "service", "appointment", "course", "ticket", "event", "subscription"]
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=1, max_length=4000)
    price_cents: int = Field(default=0, ge=0)
    currency: str = Field(default="usd", min_length=3, max_length=3)


class Event(BaseModel):
    id: str = Field(default_factory=new_id)
    host_uid: str
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=1, max_length=4000)
    starts_at: datetime
    ends_at: datetime | None = None
    location: Location | None = None
    virtual_url: HttpUrl | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=now_utc)


class EventCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=1, max_length=4000)
    starts_at: datetime
    ends_at: datetime | None = None
    location: Location | None = None
    virtual_url: HttpUrl | None = None
    tags: list[str] = Field(default_factory=list)


class NFCTagClaim(BaseModel):
    tag_id: str = Field(min_length=4, max_length=120)
    profile_id: str
    chip_type: Literal["NTAG213", "NTAG215", "NTAG216"]


class NFCTag(BaseModel):
    id: str = Field(default_factory=new_id)
    tag_id: str
    owner_uid: str
    profile_id: str
    chip_type: Literal["NTAG213", "NTAG215", "NTAG216"]
    status: Literal["claimed", "active", "inactive", "lost", "transferred"] = "claimed"
    qr_backup_url: HttpUrl | None = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=300)
    radius_miles: Literal[1, 5, 10, 25, 50, 100, 10000] = 10000
    include_private: bool = False
    user_context: dict[str, Any] = Field(default_factory=dict)


class SearchResult(BaseModel):
    profile: dict[str, Any]
    score: float = Field(ge=0, le=100)
    reasons: list[str]


class RecommendationRequest(BaseModel):
    profile: dict[str, Any]
    candidates: list[dict[str, Any]]
    limit: int = Field(default=10, ge=1, le=50)


class CompatibilityMatch(BaseModel):
    profile: dict[str, Any]
    score: float = Field(ge=0, le=100)
    reasons: list[str]
    shared_terms: dict[str, list[str]] = Field(default_factory=dict)


class AdminAction(BaseModel):
    resource_type: Literal[
        "user",
        "profile",
        "business",
        "nfc_tag",
        "listing",
        "event",
        "report",
        "subscription",
    ]
    resource_id: str
    action: Literal["approve", "reject", "suspend", "restore", "verify", "delete"]
    note: str | None = Field(default=None, max_length=1000)
