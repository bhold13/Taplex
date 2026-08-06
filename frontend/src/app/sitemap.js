export default function sitemap() {
  const routes = ["", "/products", "/activate", "/pricing", "/support", "/contact", "/login", "/register", "/privacy", "/terms"];
  return routes.map((route) => ({ url: `https://taplex.co${route}`, lastModified: new Date(), changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : route === "/products" ? .8 : .6 }));
}
