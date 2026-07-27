import { icons } from "lucide";

// Custom alias mapping for camelCase, shorthands, and legacy keys
const ALIASES = {
  refreshCw: "RefreshCw",
  "refresh-cw": "RefreshCw",
  refresh: "RefreshCw",
  rotateCw: "RotateCw",
  "rotate-cw": "RotateCw",
  x: "X",
  close: "X",
  userPlus: "UserPlus",
  "user-plus": "UserPlus",
  image: "Image",
  pin: "MapPin",
  mapPin: "MapPin",
  "map-pin": "MapPin",
  save: "Save",
  trash: "Trash2",
  share: "Share2",
  bookOpen: "BookOpen",
  calendarDays: "CalendarDays",
  fileText: "FileText",
  cloudSun: "CloudSun",
  shoppingBag: "ShoppingBag",
  chevronRight: "ChevronRight",
  chevronLeft: "ChevronLeft",
  chevronDown: "ChevronDown"
};

function nodeToSvg(children, customClass = "") {
  if (!Array.isArray(children)) return "";

  const combinedClass = `lucide-icon ${customClass}`.trim();
  const childrenStr = children
    .map((child) => {
      if (!Array.isArray(child) || child.length < 2) return "";
      const [childTag, childAttrs] = child;
      if (!childTag || typeof childAttrs !== "object" || childAttrs === null) return "";
      const childAttrStr = Object.entries(childAttrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${childTag} ${childAttrStr}/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${combinedClass}">${childrenStr}</svg>`;
}

export function renderIcon(name, customClass = "") {
  if (!name) return "";

  // 1. Direct lookup in Lucide icons
  let iconNode = icons[name];

  // 2. Check alias map
  if (!iconNode && ALIASES[name]) {
    iconNode = icons[ALIASES[name]];
  }

  // 3. Try PascalCase (e.g. "refreshCw" -> "RefreshCw")
  if (!iconNode) {
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    iconNode = icons[pascalName];
  }

  // 4. Try kebab to PascalCase (e.g. "refresh-cw" -> "RefreshCw")
  if (!iconNode) {
    const pascalKebab = name
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
    iconNode = icons[pascalKebab];
  }

  // If found in Lucide, render SVG string
  if (iconNode) {
    return nodeToSvg(iconNode, customClass);
  }

  // Clean vector fallback (Sparkles) if icon name is unknown
  return nodeToSvg(icons.Sparkles || icons.Circle, customClass);
}
