import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Bike,
  BookOpen, Bookmark, Calendar, CalendarDays, Camera,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock, CloudSun, Compass, Copy, FileText, Filter, Flag,
  GripVertical, Heart, Home, Image, Info, LogIn, LogOut,
  Mail, Map, MapPin, MessageCircle, Monitor, Moon, Navigation,
  Pencil, Play, Plus, QrCode, Radio, RefreshCw, RotateCw,
  Save, Search, Send, Share2, ShieldCheck, ShoppingBag,
  Sparkles, Sun, Sunrise, Sunset, Trash2, User, UserPlus,
  Video, X,
} from "lucide";

// Static icon map — only the icons used across the app.
// Keyed by PascalCase Lucide name.
const ICON_MAP = {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Bike,
  BookOpen, Bookmark, Calendar, CalendarDays, Camera,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock, CloudSun, Compass, Copy, FileText, Filter, Flag,
  GripVertical, Heart, Home, Image, Info, LogIn, LogOut,
  Mail, Map, MapPin, MessageCircle, Monitor, Moon, Navigation,
  Pencil, Play, Plus, QrCode, Radio, RefreshCw, RotateCw,
  Save, Search, Send, Share2, ShieldCheck, ShoppingBag,
  Sparkles, Sun, Sunrise, Sunset, Trash2, User, UserPlus,
  Video, X,
};

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
  chevronDown: "ChevronDown",
  circleHelp: "CircleHelp",
  alertTriangle: "AlertTriangle",
  arrowLeft: "ArrowLeft",
  arrowRight: "ArrowRight",
  gripVertical: "GripVertical",
  messageCircle: "MessageCircle",
  shieldCheck: "ShieldCheck",
  logIn: "LogIn",
  logOut: "LogOut",
  "log-in": "LogIn",
  "log-out": "LogOut",
  qrCode: "QrCode",
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

  // 1. Direct lookup in static map
  let iconNode = ICON_MAP[name];

  // 2. Check alias map
  if (!iconNode && ALIASES[name]) {
    iconNode = ICON_MAP[ALIASES[name]];
  }

  // 3. Try PascalCase (e.g. "refreshCw" -> "RefreshCw")
  if (!iconNode) {
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    iconNode = ICON_MAP[pascalName];
  }

  // 4. Try kebab to PascalCase (e.g. "refresh-cw" -> "RefreshCw")
  if (!iconNode) {
    const pascalKebab = name
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
    iconNode = ICON_MAP[pascalKebab];
  }

  // If found, render SVG string
  if (iconNode) {
    return nodeToSvg(iconNode, customClass);
  }

  // Sparkles fallback if icon name is unknown
  return nodeToSvg(ICON_MAP.Sparkles, customClass);
}
