const buildActions = [
  { label: "Build Profile", href: "/profile-builder", tone: "primary" },
  { label: "View Pricing", href: "/pricing", tone: "secondary" }
];

const discoverActions = [
  { label: "Get Discovered", href: "/discover", tone: "primary" },
  { label: "Create Profile", href: "/profile-builder", tone: "secondary" }
];

const upgradePanels = [
  {
    title: "Free",
    text: "Create a basic TapLex profile with bio, contact, social links, and a public profile page."
  },
  {
    title: "Pro",
    text: "Showcase more links, music, video, services, and booking options when you are ready to grow."
  },
  {
    title: "Business",
    text: "Add advanced booking, analytics, team/community tools, and verification for a more serious presence."
  }
];

const mvpRedirectPanels = [
  {
    title: "MVP focus",
    text: "TapLex is currently focused on landing, profile builder, public profiles, discover, and subscriptions."
  },
  {
    title: "Upgrade path",
    text: "Booking, analytics, teams, and verification unlock after users move into Pro or Business."
  },
  {
    title: "Keep it simple",
    text: "Advanced AI networking, marketplace, complex admin, and deep NFC management are intentionally later."
  }
];

export const pageContent = {
  about: {
    kicker: "About",
    title: "TapLex is the Rolex of the tap.",
    summary:
      "A black-and-gold NFC networking platform for creators, barbers, artists, founders, and service providers who need a premium public profile.",
    actions: buildActions,
    highlights: ["Premium profiles", "Talent showcase", "Upgrade path"],
    panels: mvpRedirectPanels
  },
  features: {
    kicker: "Features",
    title: "Everything starts with a clean tap profile.",
    summary:
      "The MVP is simple: create your premium tap profile, showcase your talent, get discovered, and upgrade when you are ready to book clients.",
    actions: buildActions,
    highlights: ["Profile", "Discover", "Booking upgrade"],
    panels: [
      { title: "Profile builder", text: "Add photo, name, username, bio, category, links, services, and contact." },
      { title: "Public profile", text: "Share a Flowpage-style profile from NFC, QR, social bios, or direct links." },
      { title: "Discover", text: "Help people find talent, services, creators, and local professionals." }
    ]
  },
  pricing: {
    kicker: "Pricing",
    title: "Start free. Upgrade when you are ready to grow.",
    summary:
      "Free users can create a basic TapLex profile. Pro and Business unlock richer showcasing, booking, analytics, community tools, and verification.",
    actions: [{ label: "Build Free Profile", href: "/profile-builder", tone: "primary" }],
    highlights: ["Free", "Pro", "Business"],
    panels: upgradePanels
  },
  discover: {
    kicker: "Discover",
    title: "Find talent, services, creators, and local professionals.",
    summary:
      "Discover is the simple community layer for TapLex: browse profiles, find people worth booking, and help users get seen.",
    actions: [{ label: "Create Your Profile", href: "/profile-builder", tone: "primary" }],
    highlights: ["Creators", "Services", "Community"],
    panels: [
      { title: "Music and media", text: "Artists, producers, videographers, DJs, and creators can showcase work." },
      { title: "Local services", text: "Barbers, stylists, consultants, coaches, and service providers can get discovered." },
      { title: "Business builders", text: "Founders and freelancers can share offers, proof, and contact paths." }
    ]
  },
  contact: {
    kicker: "Contact",
    title: "Contact TapLex.",
    summary: "Use this route for support, partnerships, NFC product interest, and early customer questions.",
    actions: [{ label: "Build Profile", href: "/profile-builder", tone: "primary" }],
    highlights: ["Support", "Partnerships", "Questions"],
    panels: [
      { title: "Support", text: "Help users with accounts, profiles, and upgrades." },
      { title: "Partnerships", text: "Talk about NFC products, local communities, and creator collaborations." },
      { title: "Sales", text: "Capture demand for premium TapLex NFC products and subscriptions." }
    ]
  },
  dashboard: {
    kicker: "Dashboard",
    title: "Your TapLex profile studio.",
    summary:
      "Keep the MVP dashboard focused: profile status, preview link, plan level, and the next step to get discovered or upgrade.",
    highlights: ["Profile completion", "Current plan", "Growth path"],
    dashboard: true
  },
  "profile-builder": {
    kicker: "Profile Builder",
    title: "Build your premium tap profile.",
    summary:
      "A fast Flowpage-style builder for photo, name, username, bio, profession, socials, media, services, contact, and booking upgrade prompts.",
    actions: [{ label: "Preview Public Profile", href: "/profile/demo", tone: "secondary" }],
    highlights: ["Simple setup", "Talent showcase", "Booking upgrade"],
    builder: true
  },
  "edit-profile": {
    kicker: "Edit Profile",
    title: "Keep your public TapLex sharp.",
    summary: "This route stays available, but the main profile editing experience now lives in the simplified profile builder.",
    actions: [{ label: "Open Builder", href: "/profile-builder", tone: "primary" }],
    highlights: ["Bio", "Links", "Services"],
    builder: true
  },
  settings: {
    kicker: "Settings",
    title: "Simple account and profile settings.",
    summary:
      "Keep settings lightweight for the MVP: account access, profile visibility, plan level, and notification preferences.",
    actions: [{ label: "Edit Profile", href: "/profile-builder", tone: "primary" }],
    highlights: ["Account", "Visibility", "Plan"],
    panels: [
      { title: "Account", text: "Manage login details and local preview auth while Firebase credentials are not configured." },
      { title: "Profile visibility", text: "Keep the public profile simple and discover-ready." },
      { title: "Plan", text: "Upgrade to unlock booking, advanced media, analytics, and verification." }
    ]
  },
  "profile-settings": {
    kicker: "Settings",
    title: "Simple account and profile settings.",
    summary: "This route remains available and now mirrors the simplified MVP settings direction.",
    actions: [{ label: "Open Settings", href: "/settings", tone: "primary" }],
    highlights: ["Account", "Profile", "Plan"],
    panels: [
      { title: "Use /settings", text: "The clean route for user settings is now /settings." },
      { title: "Profile", text: "Edit public profile basics in the profile builder." },
      { title: "Upgrade", text: "Booking and richer showcases belong behind Pro and Business." }
    ]
  },
  notifications: {
    kicker: "Notifications",
    title: "Notifications are later.",
    summary: "For the MVP, focus on profile creation, discovery, and upgrade flow before building a full alert system.",
    actions: discoverActions,
    highlights: ["Later", "Simple", "MVP"],
    panels: mvpRedirectPanels
  },
  messages: {
    kicker: "Messages",
    title: "Messaging is later.",
    summary: "For now, public profiles use a contact button and inquiry form. Full messaging can come after the core profile loop works.",
    actions: discoverActions,
    highlights: ["Contact", "Inquiry", "Later"],
    panels: mvpRedirectPanels
  },
  "community-feed": {
    kicker: "Community",
    title: "Community starts with Discover.",
    summary: "Instead of a full feed, TapLex MVP should use a clean discover directory for talent, services, and profiles.",
    actions: [{ label: "Open Discover", href: "/discover", tone: "primary" }],
    highlights: ["Discover", "Profiles", "Services"],
    panels: mvpRedirectPanels
  },
  nearby: {
    kicker: "Discover",
    title: "Local discovery belongs in Discover.",
    summary: "Nearby discovery can be added later. The MVP route for finding people is /discover.",
    actions: [{ label: "Open Discover", href: "/discover", tone: "primary" }],
    highlights: ["Local later", "Directory first", "MVP"],
    panels: mvpRedirectPanels
  },
  marketplace: {
    kicker: "Marketplace",
    title: "Marketplace is not part of the MVP yet.",
    summary: "Services can be showcased on profiles now. Full selling and marketplace listings should wait until the profile and subscription loop is proven.",
    actions: buildActions,
    highlights: ["Later", "Services", "Upgrade"],
    panels: mvpRedirectPanels
  },
  events: {
    kicker: "Events",
    title: "Events can wait.",
    summary: "Keep the first version focused on premium profiles, discovery, and upgrades before adding events.",
    actions: discoverActions,
    highlights: ["Later", "Community", "Discover"],
    panels: mvpRedirectPanels
  },
  connections: {
    kicker: "Discover",
    title: "Connections now start with simple discovery.",
    summary: "TapLex does not need complex AI networking yet. First, help users create clean profiles and get discovered.",
    actions: [{ label: "Open Discover", href: "/discover", tone: "primary" }],
    highlights: ["Profiles", "Talent", "Services"],
    panels: mvpRedirectPanels
  },
  "business-dashboard": {
    kicker: "Business",
    title: "Business features unlock later.",
    summary: "Business users will eventually get booking, analytics, team/community features, and verification.",
    actions: [{ label: "View Pricing", href: "/pricing", tone: "primary" }],
    highlights: ["Business", "Booking", "Verification"],
    panels: upgradePanels
  },
  analytics: {
    kicker: "Analytics",
    title: "Analytics are an upgrade feature.",
    summary: "Keep analytics behind Business after the core profile and discover loop is working.",
    actions: [{ label: "View Pricing", href: "/pricing", tone: "primary" }],
    highlights: ["Business", "Later", "Growth"],
    panels: upgradePanels
  },
  billing: {
    kicker: "Billing",
    title: "Upgrade when you are ready to grow.",
    summary: "Free profiles come first. Pro unlocks richer showcase and booking. Business unlocks deeper growth tools.",
    actions: [{ label: "View Pricing", href: "/pricing", tone: "primary" }],
    highlights: ["Free", "Pro", "Business"],
    panels: upgradePanels
  },
  subscription: {
    kicker: "Subscription",
    title: "Choose a growth level.",
    summary: "The subscription path should be clear and simple: free profile, Pro booking/showcase, Business growth tools.",
    actions: [{ label: "View Pricing", href: "/pricing", tone: "primary" }],
    highlights: ["Free", "Pro", "Business"],
    panels: upgradePanels
  },
  "admin-dashboard": {
    kicker: "Admin",
    title: "Simple MVP admin overview.",
    summary:
      "Keep admin lightweight for now: watch profile growth, plan upgrades, discovery quality, and support needs. Complex tools can come later.",
    actions: [{ label: "Open Discover", href: "/discover", tone: "secondary" }],
    highlights: ["Profiles", "Plans", "Support"],
    panels: [
      { title: "Profiles", text: "Review whether new profiles are clean, complete, and discover-ready." },
      { title: "Plans", text: "Track interest in Pro booking and Business verification before building complex billing tools." },
      { title: "Support", text: "Collect user questions around setup, upgrades, and NFC product demand." }
    ]
  },
  support: {
    kicker: "Support",
    title: "Support the simple TapLex MVP.",
    summary: "Help users create profiles, understand upgrades, and get ready to share their tap profile.",
    actions: buildActions,
    highlights: ["Profiles", "Upgrades", "Questions"],
    panels: mvpRedirectPanels
  },
  terms: {
    kicker: "Terms",
    title: "TapLex terms of service.",
    summary: "Users should share accurate profile information, lawful services, and respectful contact paths.",
    actions: [{ label: "Privacy", href: "/privacy", tone: "secondary" }],
    highlights: ["Accounts", "Profiles", "Conduct"],
    panels: [
      { title: "Profiles", text: "Public profiles should represent real people, brands, talent, or services." },
      { title: "Services", text: "Services offered should be accurate, lawful, and safe." },
      { title: "Upgrades", text: "Paid booking, analytics, and verification should be handled through clear subscription terms." }
    ]
  },
  privacy: {
    kicker: "Privacy",
    title: "Simple privacy for public profiles.",
    summary: "The MVP should only ask for what is needed to publish a useful public profile and contact path.",
    actions: [{ label: "Settings", href: "/settings", tone: "primary" }],
    highlights: ["Public profile", "Contact", "Account"],
    panels: [
      { title: "Public profile", text: "Users choose the public bio, links, category, services, and contact details they share." },
      { title: "Authentication", text: "Local preview auth works for development; Firebase should be configured for real accounts." },
      { title: "Data", text: "Avoid collecting advanced personal data until the MVP needs it." }
    ]
  }
};

export function getPage(key) {
  return pageContent[key];
}

export function getPublicProfile(username) {
  return {
    kicker: "Public Profile",
    title: `${username} on TapLex`,
    summary:
      "A premium public tap profile with bio, links, talent showcase, contact, and booking upgrade path.",
    actions: [
      { label: "Contact", href: "/discover", tone: "primary" },
      { label: "Build Yours", href: "/profile-builder", tone: "secondary" }
    ],
    highlights: ["Premium profile", "Showcase", "Contact"],
    username,
    bioSite: true,
    panels: [
      { title: "Services offered", text: "Brand strategy, content planning, and premium service consulting." },
      { title: "Media", text: "Featured videos, music, portfolio work, or proof." },
      { title: "Booking", text: "Upgrade-ready scheduling and inquiry capture." }
    ]
  };
}

export function getClaimPage(tagId) {
  return {
    kicker: "Claim NFC",
    title: `Claim tag ${tagId}`,
    summary:
      "Advanced NFC claim flows are later. For the MVP, connect each tap product to a clean public TapLex profile.",
    actions: [{ label: "Profile Builder", href: "/profile-builder", tone: "primary" }],
    highlights: ["NFC later", "Profile first", "Tap-ready"],
    claim: true
  };
}
