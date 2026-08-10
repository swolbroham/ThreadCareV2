import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search, Plus, Trash2, Edit2, ArrowLeft, Shield,
  Layers, CheckCircle2, AlertTriangle, ChevronRight,
  Home, BookOpen, Shirt, Sparkles, DropletIcon, Wind,
  ThermometerIcon, Check, X, Info, WashingMachineIcon,
  Camera, Upload, Star, BookmarkCheck, Tag, User, Cpu,
  SlidersHorizontal, ChevronDown, ChevronUp, Clock,
  Bookmark, RefreshCw, ImageIcon, Zap, MessageSquare, Send, SmilePlus
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type MainView = "home" | "symbols" | "wardrobe" | "plan" | "feedback";
type SymbolsSubview = "guide" | "detail";
type WardrobeSubview = "list" | "form" | "tag-upload" | "symbol-review" | "frequent";
type PlanSubview = "priority" | "results" | "saved" | "saved-detail";
type ColorGroup = "white" | "light" | "dark" | "bright";
type FabricType = "cotton" | "wool" | "silk" | "synthetic" | "denim" | "linen" | "blend";
type WashTemp = "cold" | "warm" | "hot";
type PriorityMode = "max-protection" | "balanced" | "minimize-loads";
type SymbolCategory = "all" | "washing" | "drying" | "ironing" | "bleaching" | "professional";

interface Garment {
  id: string; name: string; colorGroup: ColorGroup; fabricType: FabricType;
  washTemp: WashTemp; isDelicate: boolean; handWashOnly: boolean; dryerSafe: boolean;
  isFavorite?: boolean; selectedSymbols?: string[];
}
interface CareSymbol {
  id: string; category: "washing" | "drying" | "ironing" | "bleaching" | "professional";
  name: string; meaning: string; instruction: string; tempNote?: string;
}
interface LaundryLoad {
  id: string; name: string; garments: Garment[]; washTemp: WashTemp;
  cycle: string; warnings: string[]; color: string;
}
interface LaundryPlan { loads: LaundryLoad[]; handWashItems: Garment[]; }
interface SavedPlan {
  id: string; name: string; date: string; mode: PriorityMode;
  loadCount: number; garmentCount: number; plan: LaundryPlan;
}
interface DetectedSymbol {
  symbol: CareSymbol; confidence: number; confirmed: boolean | null;
}

// ─── Care Symbol Data ────────────────────────────────────────────────────────
const CARE_SYMBOLS: CareSymbol[] = [
  { id: "w-cold", category: "washing", name: "Machine Wash Cold", meaning: "This garment can be machine washed in cold water (30°C / 86°F).", instruction: "Use a cold or delicate cycle. Ideal for bright colors and lightly soiled items. Helps prevent color fading and shrinkage.", tempNote: "30°C" },
  { id: "w-warm", category: "washing", name: "Machine Wash Warm", meaning: "This garment can be machine washed in warm water (40°C / 104°F).", instruction: "Use a normal cycle with warm water. Suitable for everyday cottons and synthetics that are moderately soiled.", tempNote: "40°C" },
  { id: "w-hot", category: "washing", name: "Machine Wash Hot", meaning: "This garment can be machine washed in hot water (60°C / 140°F).", instruction: "Use a hot cycle. Recommended for white linens, towels, and heavily soiled items requiring deep sanitization.", tempNote: "60°C" },
  { id: "w-hand", category: "washing", name: "Hand Wash Only", meaning: "This garment must be washed by hand in cool or lukewarm water only.", instruction: "Gently agitate in a basin with mild detergent. Do not wring or twist. Rinse thoroughly and press out water before laying flat to dry." },
  { id: "w-none", category: "washing", name: "Do Not Wash", meaning: "This garment cannot be washed with water in any form.", instruction: "Dry clean or spot clean only. Water may cause irreversible shrinkage, color bleed, or structural damage to the fabric." },
  { id: "d-low", category: "drying", name: "Tumble Dry Low", meaning: "Safe to tumble dry on a low heat setting.", instruction: "Use a low heat or gentle cycle in the dryer. Remove promptly once finished to prevent wrinkles from setting." },
  { id: "d-medium", category: "drying", name: "Tumble Dry Medium", meaning: "Safe to tumble dry on a medium heat setting.", instruction: "Use a normal or medium heat cycle. Check periodically to avoid over-drying, which can cause fabric stress." },
  { id: "d-no-tumble", category: "drying", name: "Do Not Tumble Dry", meaning: "This garment should not be placed in a tumble dryer.", instruction: "Air dry only. Lay flat or hang to dry in a well-ventilated space. Tumble drying may cause shrinkage or damage to delicate fibers." },
  { id: "d-flat", category: "drying", name: "Dry Flat", meaning: "This garment must be dried lying flat on a clean surface.", instruction: "Lay on a clean dry towel or mesh drying rack in its natural shape. Reshape gently while damp to prevent stretching or distortion." },
  { id: "d-line", category: "drying", name: "Line Dry", meaning: "This garment should be hung to dry on a line or hanger.", instruction: "Hang in a well-ventilated area, ideally away from direct sunlight. Smooth out creases while the garment is still damp." },
  { id: "i-low", category: "ironing", name: "Iron Low Heat", meaning: "Iron on a low heat setting only (up to 110°C / 230°F).", instruction: "Use the coolest iron setting. Suitable for synthetic fabrics. Iron inside-out to protect the surface finish.", tempNote: "110°C" },
  { id: "i-medium", category: "ironing", name: "Iron Medium Heat", meaning: "Iron on a medium heat setting (up to 150°C / 300°F).", instruction: "Use a medium iron setting. Suitable for wool and silk. Consider using a pressing cloth to protect delicate surfaces.", tempNote: "150°C" },
  { id: "i-high", category: "ironing", name: "Iron High Heat", meaning: "Iron on a high heat setting (up to 200°C / 390°F).", instruction: "Use a hot iron setting. Suitable for cotton and linen. Steam setting can help remove deep-set wrinkles.", tempNote: "200°C" },
  { id: "i-none", category: "ironing", name: "Do Not Iron", meaning: "This garment must not be ironed under any circumstances.", instruction: "Ironing will damage the fabric or its surface treatment. Smooth out wrinkles by hand or use steam from a safe distance." },
  { id: "b-ok", category: "bleaching", name: "Bleach Allowed", meaning: "Any bleach product can be safely used on this garment.", instruction: "Dilute bleach according to product instructions before applying. Suitable for white cotton and linen items requiring brightening." },
  { id: "b-no", category: "bleaching", name: "Do Not Bleach", meaning: "No bleach of any kind should be used on this garment.", instruction: "Bleach will damage fibers, remove color, or weaken the fabric permanently. Use color-safe detergent instead." },
  { id: "b-nonchlorine", category: "bleaching", name: "Non-Chlorine Bleach Only", meaning: "Only oxygen-based or non-chlorine bleach should be used.", instruction: "Use color-safe or oxygen bleach products only. Suitable for colored fabrics that require a gentle whitening or brightening treatment." },
  { id: "p-dry", category: "professional", name: "Dry Clean Only", meaning: "This garment must be professionally dry cleaned — do not wash at home.", instruction: "Take to a certified dry cleaning professional. Do not attempt to wash with water. The solvents used are essential for safe cleaning." },
  { id: "p-no-dry", category: "professional", name: "Do Not Dry Clean", meaning: "This garment must not be sent to a dry cleaner.", instruction: "Dry cleaning solvents will damage this fabric. Refer to other symbols on the label for proper care instructions." },
  { id: "p-wet", category: "professional", name: "Professional Wet Clean", meaning: "Requires professional wet cleaning — not suitable for home washing.", instruction: "Take to a professional cleaner experienced in wet cleaning. This process uses water with specialized equipment not available for home use." },
];

const INITIAL_GARMENTS: Garment[] = [
  { id: "g1", name: "White Oxford Shirt", colorGroup: "white", fabricType: "cotton", washTemp: "warm", isDelicate: false, handWashOnly: false, dryerSafe: true, isFavorite: true },
  { id: "g2", name: "Black Denim Jeans", colorGroup: "dark", fabricType: "denim", washTemp: "cold", isDelicate: false, handWashOnly: false, dryerSafe: false, isFavorite: true },
  { id: "g3", name: "Merino Wool Sweater", colorGroup: "light", fabricType: "wool", washTemp: "cold", isDelicate: true, handWashOnly: true, dryerSafe: false, isFavorite: false },
  { id: "g4", name: "Red Silk Blouse", colorGroup: "bright", fabricType: "silk", washTemp: "cold", isDelicate: true, handWashOnly: true, dryerSafe: false, isFavorite: false },
  { id: "g5", name: "Navy Linen Trousers", colorGroup: "dark", fabricType: "linen", washTemp: "warm", isDelicate: false, handWashOnly: false, dryerSafe: true, isFavorite: true },
  { id: "g6", name: "White Terry Towels", colorGroup: "white", fabricType: "cotton", washTemp: "hot", isDelicate: false, handWashOnly: false, dryerSafe: true, isFavorite: false },
];

// Mock detection results — used in the tag scan prototype flow
const MOCK_DETECTED_SYMBOLS: DetectedSymbol[] = [
  { symbol: CARE_SYMBOLS.find(s => s.id === "w-cold")!, confidence: 0.94, confirmed: null },
  { symbol: CARE_SYMBOLS.find(s => s.id === "d-no-tumble")!, confidence: 0.88, confirmed: null },
  { symbol: CARE_SYMBOLS.find(s => s.id === "i-low")!, confidence: 0.71, confirmed: null },
  { symbol: CARE_SYMBOLS.find(s => s.id === "b-no")!, confidence: 0.82, confirmed: null },
];

// ─── Utilities ───────────────────────────────────────────────────────────────
function generateId(): string { return Math.random().toString(36).slice(2, 9); }

const COLOR_LABELS: Record<ColorGroup, string> = { white: "White / Off-White", light: "Light / Pastel", dark: "Dark", bright: "Vivid / Bright" };
const COLOR_SWATCHES: Record<ColorGroup, string> = { white: "#F5F5F0", light: "#C8D5C0", dark: "#2C3035", bright: "#D4503A" };
const FABRIC_LABELS: Record<FabricType, string> = { cotton: "Cotton", wool: "Wool", silk: "Silk", synthetic: "Synthetic", denim: "Denim", linen: "Linen", blend: "Blend" };
const TEMP_LABELS: Record<WashTemp, string> = { cold: "Cold · 30°C", warm: "Warm · 40°C", hot: "Hot · 60°C" };
const TEMP_COLORS: Record<WashTemp, string> = { cold: "#4A7FA0", warm: "#9B6E3A", hot: "#B03030" };
const LOAD_COLORS = ["#2E5C50", "#4A7C6F", "#8B5E3C", "#5B7FA6", "#6B5B95", "#7A6040"];
const MODE_LABELS: Record<PriorityMode, string> = { "max-protection": "Maximum Protection", "balanced": "Balanced", "minimize-loads": "Minimize Loads" };

function generateLaundryPlan(garments: Garment[], mode: PriorityMode): LaundryPlan {
  const handWashItems = garments.filter(g => g.handWashOnly);
  const machineItems = garments.filter(g => !g.handWashOnly);
  const groups = new Map<string, Garment[]>();
  machineItems.forEach(g => {
    let key: string;
    if (mode === "max-protection") { key = `${g.colorGroup}|${g.isDelicate ? "delicate" : "normal"}|${g.washTemp}`; }
    else if (mode === "balanced") { const c = g.colorGroup === "white" ? "whites" : (g.colorGroup === "dark" || g.colorGroup === "bright") ? "darks" : "lights"; key = `${c}|${g.isDelicate ? "delicate" : "normal"}`; }
    else { key = g.colorGroup === "white" ? "whites" : (g.colorGroup === "dark" || g.colorGroup === "bright") ? "darks" : "lights"; }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  });
  const tempOrder: Record<WashTemp, number> = { cold: 0, warm: 1, hot: 2 };
  const colorNameMap: Record<string, string> = { white: "Whites", whites: "Whites", light: "Light Colors", lights: "Light Colors", dark: "Darks", darks: "Darks", bright: "Brights" };
  const loads: LaundryLoad[] = Array.from(groups.entries()).map(([key, items], i) => {
    const lowestTemp = items.reduce<WashTemp>((min, g) => tempOrder[g.washTemp] < tempOrder[min] ? g.washTemp : min, items[0].washTemp);
    const hasDelicate = items.some(g => g.isDelicate);
    const cycle = hasDelicate ? "Gentle / Delicate" : lowestTemp === "hot" ? "Normal — Hot" : lowestTemp === "warm" ? "Normal — Warm" : "Normal — Cold";
    const parts = key.split("|");
    let name = colorNameMap[parts[0]] || parts[0];
    if (parts[1] === "delicate") name += " (Delicates)";
    if (parts[2] === "hot") name += " — Hot Wash";
    const warnings: string[] = [];
    if (items.some(g => g.colorGroup === "bright") && items.some(g => g.colorGroup === "light")) warnings.push("Bright colors may bleed onto lighter items — consider a color-catch sheet.");
    if (items.some(g => !g.dryerSafe)) warnings.push("Some items in this load are not dryer-safe — air dry those items separately.");
    if (hasDelicate && !items.every(g => g.isDelicate)) warnings.push("Mixed delicate and standard items — use a mesh laundry bag for delicates.");
    return { id: `load-${i}`, name, garments: items, washTemp: lowestTemp, cycle, warnings, color: LOAD_COLORS[i % LOAD_COLORS.length] };
  });
  return { loads, handWashItems };
}

// ─── Care Symbol SVG ─────────────────────────────────────────────────────────
function SymbolSVG({ symbol, size = 48, className = "" }: { symbol: CareSymbol; size?: number; className?: string }) {
  const sp = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (symbol.category === "washing") {
    if (symbol.id === "w-hand") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M16 28 Q18 22 20 20 L20 28" {...sp} /><path d="M20 18 Q22 16 24 18 L24 28" {...sp} /><path d="M24 18 Q26 16 28 18 L28 28" {...sp} /><path d="M28 20 Q30 18 32 20 L32 28 Q32 32 28 32 L20 32 Q16 32 16 28" {...sp} /><path d="M10 36 Q14 32 18 34 Q22 36 26 34 Q30 32 34 34 Q38 36 40 38" {...sp} /></svg>);
    if (symbol.id === "w-none") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M9 14 L11 9 L37 9 L39 14 L39 35 Q39 37 37 37 L11 37 Q9 37 9 35 Z" {...sp} /><path d="M16 24 Q19 21 22 24 Q25 27 28 24 Q31 21 34 24" {...sp} /><line x1="12" y1="12" x2="38" y2="38" stroke="currentColor" strokeWidth="1.5" /></svg>);
    return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M9 14 L11 9 L37 9 L39 14 L39 35 Q39 37 37 37 L11 37 Q9 37 9 35 Z" {...sp} /><path d="M16 27 Q19 24 22 27 Q25 30 28 27 Q31 24 34 27" {...sp} /><text x="24" y="21" textAnchor="middle" fontSize="8" fontFamily="DM Mono, monospace" fill="currentColor" stroke="none" fontWeight="500">{symbol.tempNote}</text></svg>);
  }
  if (symbol.category === "drying") {
    if (symbol.id === "d-flat") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><rect x="8" y="12" width="32" height="24" rx="2" {...sp} /><line x1="8" y1="24" x2="40" y2="24" {...sp} /><path d="M18 18 L24 24 L30 18" {...sp} /></svg>);
    if (symbol.id === "d-line") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><line x1="6" y1="13" x2="42" y2="13" {...sp} /><line x1="18" y1="13" x2="18" y2="38" {...sp} /><line x1="30" y1="13" x2="30" y2="38" {...sp} /><path d="M18 38 Q24 35 30 38" {...sp} /></svg>);
    if (symbol.id === "d-no-tumble") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><rect x="8" y="12" width="32" height="24" rx="2" {...sp} /><circle cx="24" cy="24" r="8" {...sp} /><line x1="10" y1="12" x2="38" y2="36" stroke="currentColor" strokeWidth="1.5" /></svg>);
    const dots = symbol.id === "d-low" ? [{ x: 24 }] : [{ x: 20 }, { x: 28 }];
    return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><rect x="8" y="12" width="32" height="24" rx="2" {...sp} /><circle cx="24" cy="24" r="8" {...sp} />{dots.map((d, i) => <circle key={i} cx={d.x} cy={24} r="2" fill="currentColor" stroke="none" />)}</svg>);
  }
  if (symbol.category === "ironing") {
    if (symbol.id === "i-none") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M8 34 L8 24 Q8 20 14 20 L38 20 Q44 20 44 24 L44 28 Q44 30 42 30 L8 30 Z" {...sp} /><rect x="20" y="30" width="8" height="5" rx="1" {...sp} /><line x1="14" y1="20" x2="40" y2="34" stroke="currentColor" strokeWidth="1.5" /></svg>);
    const dotCount = symbol.id === "i-low" ? 1 : symbol.id === "i-medium" ? 2 : 3;
    const dotXs = dotCount === 1 ? [24] : dotCount === 2 ? [20, 28] : [16, 24, 32];
    return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M8 34 L8 24 Q8 20 14 20 L38 20 Q44 20 44 24 L44 28 Q44 30 42 30 L8 30 Z" {...sp} /><rect x="20" y="30" width="8" height="5" rx="1" {...sp} />{dotXs.map((x, i) => <circle key={i} cx={x} cy={25} r="2" fill="currentColor" stroke="none" />)}</svg>);
  }
  if (symbol.category === "bleaching") {
    if (symbol.id === "b-no") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M24 7 L41 38 L7 38 Z" {...sp} /><line x1="13" y1="20" x2="37" y2="36" stroke="currentColor" strokeWidth="1.5" /></svg>);
    if (symbol.id === "b-nonchlorine") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M24 7 L41 38 L7 38 Z" {...sp} /><text x="24" y="34" textAnchor="middle" fontSize="11" fontFamily="DM Mono, monospace" fill="currentColor" stroke="none" fontWeight="500">CL</text><line x1="14" y1="22" x2="34" y2="37" stroke="currentColor" strokeWidth="1.5" /></svg>);
    return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><path d="M24 7 L41 38 L7 38 Z" {...sp} /></svg>);
  }
  if (symbol.category === "professional") {
    if (symbol.id === "p-no-dry") return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><circle cx="24" cy="24" r="16" {...sp} /><line x1="13" y1="13" x2="35" y2="35" stroke="currentColor" strokeWidth="1.5" /></svg>);
    return (<svg width={size} height={size} viewBox="0 0 48 48" className={className}><circle cx="24" cy="24" r="16" {...sp} /><text x="24" y="30" textAnchor="middle" fontSize="14" fontFamily="DM Mono, monospace" fill="currentColor" stroke="none" fontWeight="500">{symbol.id === "p-wet" ? "W" : "P"}</text></svg>);
  }
  return <div style={{ width: size, height: size }} />;
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "teal" | "amber" | "red" | "future" }) {
  const cls = {
    default: "bg-secondary text-secondary-foreground",
    teal: "bg-primary/10 text-primary",
    amber: "bg-[#B85C38]/10 text-[#B85C38]",
    red: "bg-destructive/10 text-destructive",
    future: "bg-[#5B7FA6]/10 text-[#5B7FA6]",
  }[variant];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`}>{children}</span>;
}

function Btn({ children, onClick, variant = "primary", size = "md", className = "", disabled = false, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded transition-all duration-150 cursor-pointer select-none min-h-[44px]";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted active:scale-[0.98]",
    ghost: "text-foreground hover:bg-secondary active:scale-[0.98]",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98]",
  }[variant];
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-4 py-2.5", lg: "px-6 py-3 text-lg" }[size];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants} ${sizes} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-1 min-h-[44px]">
      <span className="text-sm text-foreground leading-snug">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-1 left-1 w-5 h-5 bg-card rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </label>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function NavBar({ view, onNav, garmentCount }: { view: MainView; onNav: (v: MainView) => void; garmentCount: number }) {
  const navItems: { id: MainView; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <Home size={20} />, label: "Home" },
    { id: "symbols", icon: <BookOpen size={20} />, label: "Symbols" },
    { id: "wardrobe", icon: <Shirt size={20} />, label: "Wardrobe" },
    { id: "plan", icon: <Sparkles size={20} />, label: "Plan" },
  ];
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
          <button onClick={() => onNav("home")} className="text-lg text-primary hover:opacity-75 transition-opacity" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>ThreadCare</button>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => onNav(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors duration-150 min-h-[40px]
                  ${view === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                {item.icon}<span>{item.label}</span>
                {item.id === "wardrobe" && garmentCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-mono flex items-center justify-center">{garmentCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border flex" role="navigation" aria-label="Main navigation">
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} aria-current={view === item.id ? "page" : undefined}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-150 min-h-[56px]
              ${view === item.id ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`transition-transform duration-150 ${view === item.id ? "scale-110" : ""}`}>{item.icon}</span>
            <span className={`text-[10px] font-medium leading-none ${view === item.id ? "text-primary" : ""}`}>{item.label}</span>
            {item.id === "wardrobe" && garmentCount > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-14px)] w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-mono flex items-center justify-center">{garmentCount}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-background pt-14 pb-20 sm:pt-14 sm:pb-0 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-10">{children}</div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 sm:mb-8">
      <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">{eyebrow}</p>
      <h1 className="text-2xl sm:text-3xl text-foreground mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}

// ─── Home View ───────────────────────────────────────────────────────────────
function HomeView({ garmentCount, onNav, savedPlans, onViewSaved, onViewPlan }: {
  garmentCount: number; onNav: (v: MainView) => void; savedPlans: SavedPlan[];
  onViewSaved: () => void; onViewPlan: (plan: SavedPlan) => void;
}) {
  const entries = [
    { icon: <Sparkles size={20} />, title: "Create a Laundry Plan", desc: "Group your garments into optimized loads with wash settings.", action: () => onNav("plan"), color: "bg-primary text-primary-foreground", cta: "Start Planning" },
    { icon: <BookOpen size={20} />, title: "Care Symbol Guide", desc: "Decode every symbol on your clothing labels — all 20 explained.", action: () => onNav("symbols"), color: "bg-[#8B5E3C]/10 text-[#8B5E3C]", cta: "Browse Symbols" },
    { icon: <Shirt size={20} />, title: "Manage Wardrobe", desc: `${garmentCount} garments saved. Add items, edit details, or review your collection.`, action: () => onNav("wardrobe"), color: "bg-[#5B7FA6]/10 text-[#5B7FA6]", cta: "View Wardrobe" },
  ];
  return (
    <PageShell>
      <div className="mb-10 sm:mb-14 lg:grid lg:grid-cols-5 lg:gap-12 lg:items-end">
        <div className="lg:col-span-3">
          <p className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase mb-3 sm:mb-4">Laundry Intelligence</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4 sm:mb-5 text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            Care for your<br /><em>clothes with clarity.</em>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">ThreadCare helps you decode garment labels, build your wardrobe profile, and generate smart laundry plans that protect every piece you own.</p>
        </div>
        <div className="hidden lg:block lg:col-span-2">
          <div className="grid grid-cols-3 gap-3 opacity-40">
            {CARE_SYMBOLS.slice(0, 6).map(sym => (
              <div key={sym.id} className="aspect-square flex items-center justify-center bg-card rounded-lg border border-border text-muted-foreground">
                <SymbolSVG symbol={sym} size={32} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
        {entries.map((e, i) => (
          <button key={i} onClick={e.action}
            className="group text-left bg-card border border-border rounded-xl p-5 sm:p-6 hover:border-primary/30 hover:shadow-sm transition-all duration-200 active:scale-[0.99] min-h-[44px]">
            <div className={`w-10 h-10 rounded-lg ${e.color} flex items-center justify-center mb-3 sm:mb-4`}>{e.icon}</div>
            <h3 className="font-semibold text-foreground mb-1 sm:mb-1.5 text-sm sm:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>{e.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4">{e.desc}</p>
            <span className="text-xs sm:text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">{e.cta} <ChevronRight size={13} /></span>
          </button>
        ))}
      </div>

      {/* Saved Plans section */}
      {savedPlans.length > 0 && (
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Recent Plans</p>
            <button onClick={onViewSaved} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">View all <ChevronRight size={11} /></button>
          </div>
          <div className="space-y-2">
            {savedPlans.slice(0, 2).map(plan => (
              <button key={plan.id} onClick={() => onViewPlan(plan)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-primary/30 hover:shadow-sm active:scale-[0.99] transition-all duration-150">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Bookmark size={15} className="text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{plan.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{plan.date} · {plan.loadCount} loads · {plan.garmentCount} garments</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge variant="teal">{MODE_LABELS[plan.mode].split(" ")[0]}</Badge>
                  <ChevronRight size={13} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 divide-x divide-border bg-card border border-border rounded-xl overflow-hidden mb-8 sm:mb-10">
        {([
          { value: garmentCount, label: "Garments Saved", nav: "wardrobe" as MainView },
          { value: CARE_SYMBOLS.length, label: "Symbols", nav: "symbols" as MainView },
          { value: 3, label: "Plan Modes", nav: "plan" as MainView },
        ]).map((s, i) => (
          <button key={i} onClick={() => onNav(s.nav)}
            className="flex flex-col items-center justify-center py-4 px-2 sm:px-4 hover:bg-secondary/60 active:bg-secondary transition-colors duration-150 min-h-[72px] group">
            <p className="text-xl sm:text-2xl font-mono font-medium text-primary group-hover:text-primary/80 transition-colors">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 text-center group-hover:text-foreground transition-colors">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Future Features teasers + Feedback */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Coming Soon</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative bg-card border border-border rounded-xl p-5 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#5B7FA6]/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#5B7FA6]/10 flex items-center justify-center flex-shrink-0"><Cpu size={18} className="text-[#5B7FA6]" /></div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>Auto Symbol Recognition</span><Badge variant="future">Soon</Badge></div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Point your camera at a care label — ThreadCare will identify all symbols instantly using on-device computer vision.</p>
                </div>
              </div>
            </div>
            <div className="relative bg-card border border-border rounded-xl p-5 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><User size={18} className="text-primary" /></div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>User Accounts</span><Badge variant="future">Soon</Badge></div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Sync your wardrobe and saved plans across devices. Share laundry settings with household members.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback entry */}
        <div className="flex flex-col">
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Your Voice</p>
          <button onClick={() => onNav("feedback")}
            className="flex-1 relative bg-accent/8 border border-accent/20 rounded-xl p-5 text-left hover:bg-accent/12 hover:border-accent/35 active:scale-[0.99] transition-all duration-150 overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-28 h-28 bg-accent/8 rounded-full translate-x-8 translate-y-8" />
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                <MessageSquare size={18} className="text-accent" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Share Feedback</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">Help shape ThreadCare. Tell us what works, what's missing, and what you'd love to see next.</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent group-hover:gap-2 transition-all">
                Leave feedback <ChevronRight size={12} />
              </span>
            </div>
          </button>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Symbol Guide View ────────────────────────────────────────────────────────
function SymbolGuideView({ onSelect }: { onSelect: (s: CareSymbol) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SymbolCategory>("all");
  const [showFilterSummary, setShowFilterSummary] = useState(false);

  const cats: SymbolCategory[] = ["all", "washing", "drying", "ironing", "bleaching", "professional"];
  const catLabels: Record<SymbolCategory, string> = { all: "All", washing: "Washing", drying: "Drying", ironing: "Ironing", bleaching: "Bleaching", professional: "Professional" };

  const filtered = useMemo(() => CARE_SYMBOLS.filter(s => {
    const matchCat = category === "all" || s.category === category;
    const matchQ = !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.meaning.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  }), [query, category]);

  const isFiltered = query !== "" || category !== "all";
  const activeFilterCount = (query ? 1 : 0) + (category !== "all" ? 1 : 0);

  const clearAll = () => { setQuery(""); setCategory("all"); };

  return (
    <PageShell>
      <SectionHeader eyebrow="Reference" title="Care Symbol Guide" subtitle="Understand every symbol on your garment labels." />

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search symbols…"
          className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px]"
          style={{ fontFamily: "'DM Sans', sans-serif" }} />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 sm:mx-0 px-4 sm:px-0" style={{ scrollbarWidth: "none" }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors duration-150 min-h-[40px]
              ${category === c ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
            {catLabels[c]}
          </button>
        ))}
      </div>

      {/* Active filter state chips */}
      {isFiltered && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <SlidersHorizontal size={12} />
            <span>{filtered.length} of {CARE_SYMBOLS.length} symbols</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {query && (
              <button onClick={() => setQuery("")}
                className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium hover:bg-primary/20 transition-colors">
                <Search size={10} /> "{query}" <X size={10} />
              </button>
            )}
            {category !== "all" && (
              <button onClick={() => setCategory("all")}
                className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium hover:bg-primary/20 transition-colors">
                {catLabels[category]} <X size={10} />
              </button>
            )}
            {activeFilterCount > 1 && (
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline px-1 min-h-[28px]">
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Symbol grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-1">No symbols match your search.</p>
          <p className="text-sm mb-4">Try adjusting your filters or clearing your search.</p>
          <button onClick={clearAll} className="text-sm text-primary font-medium hover:underline flex items-center gap-1 mx-auto">
            <X size={14} /> Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(sym => (
            <button key={sym.id} onClick={() => onSelect(sym)}
              className="group text-left bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 active:scale-[0.99]">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center text-primary">
                  <SymbolSVG symbol={sym} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="default">{catLabels[sym.category]}</Badge>
                  <h3 className="font-medium text-foreground mt-1.5 mb-1 text-sm leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>{sym.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{sym.meaning}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                View details <ChevronRight size={11} />
              </div>
            </button>
          ))}
        </div>
      )}
    </PageShell>
  );
}

// ─── Symbol Detail View ───────────────────────────────────────────────────────
function SymbolDetailView({ symbol, onBack }: { symbol: CareSymbol; onBack: () => void }) {
  const catLabels: Record<string, string> = { washing: "Washing", drying: "Drying", ironing: "Ironing", bleaching: "Bleaching", professional: "Professional Care" };
  const related = CARE_SYMBOLS.filter(s => s.category === symbol.category && s.id !== symbol.id).slice(0, 3);
  return (
    <PageShell>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors min-h-[44px]">
        <ArrowLeft size={14} /> Back to Symbol Guide
      </button>
      <div className="lg:grid lg:grid-cols-5 lg:gap-12">
        <div className="lg:col-span-2 mb-6 sm:mb-8 lg:mb-0">
          <div className="bg-card border border-border rounded-2xl flex items-center justify-center text-primary" style={{ padding: "clamp(2rem, 8vw, 2.5rem)" }}>
            <SymbolSVG symbol={symbol} size={100} />
          </div>
          {symbol.tempNote && (
            <div className="mt-3 flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
              <ThermometerIcon size={16} className="text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className="ml-auto font-mono font-medium text-foreground">{symbol.tempNote}</span>
            </div>
          )}
        </div>
        <div className="lg:col-span-3">
          <Badge variant="teal">{catLabels[symbol.category]}</Badge>
          <h1 className="text-2xl sm:text-3xl text-foreground mt-3 mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>{symbol.name}</h1>
          <div className="mt-5 sm:mt-6 space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">What it means</h3>
              <p className="text-sm sm:text-base text-foreground leading-relaxed">{symbol.meaning}</p>
            </div>
            <div className="w-full h-px bg-border" />
            <div>
              <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">How to follow it</h3>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <p className="text-sm text-foreground leading-relaxed">{symbol.instruction}</p>
              </div>
            </div>
            {symbol.id.includes("no") || symbol.id.includes("none") ? (
              <div className="flex gap-3 bg-accent/10 border border-accent/20 rounded-xl p-4">
                <AlertTriangle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent">Ignoring this symbol may permanently damage the garment.</p>
              </div>
            ) : (
              <div className="flex gap-3 bg-primary/5 border border-primary/15 rounded-xl p-4">
                <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary">Following this symbol helps extend the life of your garment.</p>
              </div>
            )}
          </div>
          {related.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Related Symbols</h3>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {related.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                    <div className="text-muted-foreground"><SymbolSVG symbol={r} size={20} /></div>
                    <span className="text-xs text-muted-foreground">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ─── Garment Entry Form (with edit change summary + scan tag entry) ───────────
// ─── SymbolPicker ─────────────────────────────────────────────────────────────
function SymbolPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const categories = ["washing", "drying", "ironing", "bleaching", "professional"] as const;
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>("washing");

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const categorySymbols = CARE_SYMBOLS.filter(s => s.category === activeCategory);
  const selectedSet = new Set(selected);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Care Label Symbols</p>
        {selected.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-primary bg-primary/8 border border-primary/20 px-2 py-0.5 rounded-full">
            <Check size={10} />
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Selected summary strip */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-primary/5 border border-primary/15 rounded-lg">
          {selected.map(id => {
            const sym = CARE_SYMBOLS.find(s => s.id === id);
            if (!sym) return null;
            return (
              <button key={id} type="button" onClick={() => toggle(id)}
                title={`Remove ${sym.name}`}
                className="flex items-center gap-1.5 bg-card border border-primary/25 rounded-lg px-2 py-1 text-xs text-primary hover:bg-accent/10 hover:border-accent/40 transition-all group min-h-[32px]">
                <SymbolSVG symbol={sym} size={18} className="flex-shrink-0" />
                <span className="leading-tight max-w-[80px] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{sym.name}</span>
                <X size={10} className="flex-shrink-0 text-muted-foreground group-hover:text-accent" />
              </button>
            );
          })}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
        {categories.map(cat => {
          const count = CARE_SYMBOLS.filter(s => s.category === cat && selectedSet.has(s.id)).length;
          return (
            <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 min-h-[32px]
                ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
              {SYMBOL_CATEGORY_LABELS[cat]}
              {count > 0 && (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono
                  ${activeCategory === cat ? "bg-white/25 text-white" : "bg-primary/15 text-primary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Symbol grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5">
        {categorySymbols.map(sym => {
          const isSelected = selectedSet.has(sym.id);
          return (
            <button key={sym.id} type="button" onClick={() => toggle(sym.id)}
              className={`relative flex flex-col items-center gap-2 px-2 py-3 rounded-xl border transition-all duration-150 min-h-[88px] group
                ${isSelected
                  ? "border-primary bg-primary/8 shadow-[inset_0_0_0_1px] shadow-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"}`}>
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check size={9} className="text-white" />
                </span>
              )}
              <div className={`transition-opacity ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-90"}`}>
                <SymbolSVG symbol={sym} size={34} />
              </div>
              <p className={`text-[10px] text-center leading-tight line-clamp-2 font-medium
                ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {sym.name}
              </p>
            </button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground text-center" style={{ fontFamily: "'DM Mono', monospace" }}>
          Select the symbols found on this garment's care label
        </p>
      )}
    </div>
  );
}

const EMPTY_FORM = { name: "", colorGroup: "white" as ColorGroup, fabricType: "cotton" as FabricType, washTemp: "cold" as WashTemp, isDelicate: false, handWashOnly: false, dryerSafe: true, selectedSymbols: [] as string[] };

const SYMBOL_CATEGORY_LABELS: Record<string, string> = {
  washing: "Washing",
  drying: "Drying",
  ironing: "Ironing",
  bleaching: "Bleaching",
  professional: "Professional",
};

function GarmentForm({ editing, onSave, onCancel, onScanTag, scannedSymbols }: {
  editing?: Garment; onSave: (g: Garment) => void; onCancel: () => void;
  onScanTag: () => void; scannedSymbols?: DetectedSymbol[];
}) {
  const [form, setForm] = useState(editing ? { ...EMPTY_FORM, ...editing, selectedSymbols: editing.selectedSymbols ?? [] } : { ...EMPTY_FORM, id: "" });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(prev => ({ ...prev, [k]: v }));

  // Apply confirmed scanned symbols when they arrive
  useEffect(() => {
    if (!scannedSymbols) return;
    const confirmed = scannedSymbols.filter(d => d.confirmed === true);
    const updates: Partial<typeof form> = {};
    confirmed.forEach(({ symbol }) => {
      if (symbol.id === "w-cold") updates.washTemp = "cold";
      if (symbol.id === "w-warm") updates.washTemp = "warm";
      if (symbol.id === "w-hot") updates.washTemp = "hot";
      if (symbol.id === "w-hand") { updates.handWashOnly = true; updates.isDelicate = true; }
      if (symbol.id === "d-no-tumble" || symbol.id === "d-flat" || symbol.id === "d-line") updates.dryerSafe = false;
      if (symbol.id === "i-low" || symbol.id === "w-hand") updates.isDelicate = true;
    });
    if (Object.keys(updates).length > 0) setForm(prev => ({ ...prev, ...updates }));
  }, [scannedSymbols]);

  const colorGroups: ColorGroup[] = ["white", "light", "dark", "bright"];
  const fabrics: FabricType[] = ["cotton", "wool", "silk", "synthetic", "denim", "linen", "blend"];
  const temps: WashTemp[] = ["cold", "warm", "hot"];

  // Change summary for edit mode
  const changes = useMemo(() => {
    if (!editing) return [];
    const diffs: string[] = [];
    if (editing.washTemp !== form.washTemp) diffs.push(`Wash temp: ${TEMP_LABELS[editing.washTemp].split(" · ")[0]} → ${TEMP_LABELS[form.washTemp].split(" · ")[0]}`);
    if (editing.fabricType !== form.fabricType) diffs.push(`Fabric: ${FABRIC_LABELS[editing.fabricType]} → ${FABRIC_LABELS[form.fabricType]}`);
    if (editing.colorGroup !== form.colorGroup) diffs.push(`Color: ${COLOR_LABELS[editing.colorGroup]} → ${COLOR_LABELS[form.colorGroup]}`);
    if (editing.isDelicate !== form.isDelicate) diffs.push(`Delicate: ${editing.isDelicate ? "On" : "Off"} → ${form.isDelicate ? "On" : "Off"}`);
    if (editing.handWashOnly !== form.handWashOnly) diffs.push(`Hand wash: ${editing.handWashOnly ? "Required" : "Not required"} → ${form.handWashOnly ? "Required" : "Not required"}`);
    if (editing.dryerSafe !== form.dryerSafe) diffs.push(`Dryer: ${editing.dryerSafe ? "Safe" : "Avoid"} → ${form.dryerSafe ? "Safe" : "Avoid"}`);
    const prevSyms = editing.selectedSymbols ?? [];
    const nextSyms = form.selectedSymbols ?? [];
    const added = nextSyms.filter(s => !prevSyms.includes(s));
    const removed = prevSyms.filter(s => !nextSyms.includes(s));
    if (added.length > 0) diffs.push(`Symbols added: ${added.map(id => CARE_SYMBOLS.find(s => s.id === id)?.name ?? id).join(", ")}`);
    if (removed.length > 0) diffs.push(`Symbols removed: ${removed.map(id => CARE_SYMBOLS.find(s => s.id === id)?.name ?? id).join(", ")}`);
    return diffs;
  }, [editing, form]);

  const handleSave = () => { if (!form.name.trim()) return; onSave({ ...form, id: editing?.id || generateId() }); };

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 sm:pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors min-h-[44px]">
          <ArrowLeft size={14} /> Back to Wardrobe
        </button>
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
              {editing ? "Edit Garment" : "Add New Garment"}
            </h1>
            {editing && <Badge variant="amber">Editing</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Fill in the care details from the garment label.</p>
        </div>

        {/* Scan Care Tag shortcut */}
        {!editing && (
          <button onClick={onScanTag}
            className="w-full flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3.5 mb-6 hover:bg-primary/10 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Camera size={18} className="text-primary" /></div>
            <div className="flex-1 text-left">
              <p className="font-medium text-primary text-sm">Scan Care Tag</p>
              <p className="text-xs text-primary/70">Upload a photo of the label to auto-fill details</p>
            </div>
            <ChevronRight size={16} className="text-primary/50 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {scannedSymbols && scannedSymbols.some(d => d.confirmed) && (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-5">
            <CheckCircle2 size={15} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary leading-relaxed">
              {scannedSymbols.filter(d => d.confirmed).length} symbol{scannedSymbols.filter(d => d.confirmed).length > 1 ? "s" : ""} applied from your scanned tag. Review the fields below and adjust as needed.
            </p>
          </div>
        )}

        <div className="space-y-4 sm:space-y-7">
          {/* Name */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <label htmlFor="garment-name" className="block text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Garment Name</label>
            <input id="garment-name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. White Oxford Shirt"
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-base outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }} />
          </div>

          {/* Color Group */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <p className="block text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Color Group</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {colorGroups.map(c => (
                <button key={c} type="button" onClick={() => set("colorGroup", c)}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg border text-sm font-medium text-left transition-all duration-150 min-h-[52px]
                    ${form.colorGroup === c ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted hover:text-foreground"}`}>
                  <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: COLOR_SWATCHES[c] }} />
                  <span className="leading-tight">{COLOR_LABELS[c]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fabric Type */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <p className="block text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Fabric Type</p>
            <div className="flex flex-wrap gap-2">
              {fabrics.map(f => (
                <button key={f} type="button" onClick={() => set("fabricType", f)}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150 min-h-[40px]
                    ${form.fabricType === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                  {FABRIC_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Wash Temp */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <p className="block text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Max Wash Temperature</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {temps.map(t => (
                <button key={t} type="button" onClick={() => set("washTemp", t)}
                  className={`py-3 px-2 sm:px-4 rounded-lg border text-sm font-medium transition-all duration-150 min-h-[64px] flex flex-col items-center justify-center gap-1
                    ${form.washTemp === t ? "border-primary bg-primary/5" : "border-border text-muted-foreground hover:border-muted hover:text-foreground"}`}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TEMP_COLORS[t] }} />
                  <span className={`text-center leading-tight ${form.washTemp === t ? "text-primary" : ""}`}>
                    <span className="block">{t === "cold" ? "Cold" : t === "warm" ? "Warm" : "Hot"}</span>
                    <span className="block text-xs font-mono opacity-70">{t === "cold" ? "30°C" : t === "warm" ? "40°C" : "60°C"}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Special Care */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <p className="block text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">Special Care</p>
            <div className="space-y-0 divide-y divide-border">
              <Toggle checked={form.isDelicate} onChange={v => set("isDelicate", v)} label="Delicate fabric — handle with extra care" />
              <Toggle checked={form.handWashOnly} onChange={v => set("handWashOnly", v)} label="Hand wash only — do not machine wash" />
              <Toggle checked={form.dryerSafe} onChange={v => set("dryerSafe", v)} label="Dryer safe — can go in the tumble dryer" />
            </div>
          </div>

          {/* Care Label Symbols */}
          <SymbolPicker
            selected={form.selectedSymbols ?? []}
            onChange={vals => set("selectedSymbols", vals)}
          />

          {/* Edit change summary */}
          {editing && changes.length > 0 && (
            <div className="bg-amber-50 border border-[#B85C38]/20 rounded-xl p-4 sm:p-5">
              <p className="text-xs font-mono tracking-widest text-[#B85C38] uppercase mb-2.5">Unsaved Changes</p>
              <ul className="space-y-1.5">
                {changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B85C38] flex-shrink-0 mt-1.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {editing && changes.length === 0 && (
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
              <Info size={14} className="flex-shrink-0" /> No changes made yet.
            </div>
          )}
        </div>
      </div>

      <div className="fixed sm:static bottom-[56px] sm:bottom-auto left-0 right-0 sm:left-auto sm:right-auto bg-card sm:bg-transparent border-t sm:border-t-0 border-border px-4 sm:px-5 py-3 sm:py-0 sm:mt-8 flex gap-3 sm:max-w-2xl sm:mx-auto">
        <Btn onClick={onCancel} variant="secondary" className="flex-shrink-0">Cancel</Btn>
        <Btn onClick={handleSave} variant="primary" disabled={!form.name.trim()} className="flex-1 justify-center">
          <Check size={16} /> {editing ? "Save Changes" : "Add Garment"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Frequent Items Preview ───────────────────────────────────────────────────
function FrequentItemsSection({ garments, onEdit }: { garments: Garment[]; onEdit: (g: Garment) => void }) {
  const [expanded, setExpanded] = useState(true);
  const favorites = garments.filter(g => g.isFavorite);
  if (favorites.length === 0) return null;
  return (
    <div className="mb-6 sm:mb-8">
      <button onClick={() => setExpanded(e => !e)} className="flex items-center justify-between w-full mb-3 min-h-[36px]">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-[#9B6E3A]" />
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">Your Regulars</p>
          <span className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{favorites.length}</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="space-y-2">
          {favorites.map(g => (
            <div key={g.id} className="flex items-center gap-3 bg-[#9B6E3A]/5 border border-[#9B6E3A]/15 rounded-xl px-4 py-3">
              <Star size={13} className="text-[#9B6E3A] flex-shrink-0" />
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLOR_SWATCHES[g.colorGroup] + "35" }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_SWATCHES[g.colorGroup] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{FABRIC_LABELS[g.fabricType]} · {TEMP_LABELS[g.washTemp]}</p>
              </div>
              <button onClick={() => onEdit(g)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
                <Edit2 size={13} />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground px-1">
            Tap <Star size={10} className="inline" /> on any garment to mark it as a regular.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Inline Symbol Picker (compact, for GarmentRow panels) ──────────────────
function InlineSymbolPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const categories = ["washing", "drying", "ironing", "bleaching", "professional"] as const;
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>("washing");
  const selectedSet = new Set(selected);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const categorySymbols = CARE_SYMBOLS.filter(s => s.category === activeCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Care Label Symbols</p>
        {selected.length > 0 && (
          <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2.5 bg-primary/5 border border-primary/15 rounded-lg">
          {selected.map(id => {
            const sym = CARE_SYMBOLS.find(s => s.id === id);
            if (!sym) return null;
            return (
              <button key={id} type="button" onClick={() => toggle(id)}
                title={`Remove ${sym.name}`}
                className="flex items-center gap-1 bg-card border border-primary/20 rounded-md px-1.5 py-1 text-[10px] text-primary hover:border-accent/40 hover:bg-accent/5 transition-all group min-h-[28px]">
                <SymbolSVG symbol={sym} size={14} className="flex-shrink-0 opacity-80" />
                <span className="max-w-[64px] truncate leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{sym.name}</span>
                <X size={8} className="flex-shrink-0 text-muted-foreground group-hover:text-accent ml-0.5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {categories.map(cat => {
          const count = CARE_SYMBOLS.filter(s => s.category === cat && selectedSet.has(s.id)).length;
          return (
            <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all min-h-[28px]
                ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
              {SYMBOL_CATEGORY_LABELS[cat]}
              {count > 0 && (
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-mono
                  ${activeCategory === cat ? "bg-white/25 text-white" : "bg-primary/15 text-primary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Symbol grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {categorySymbols.map(sym => {
          const isSelected = selectedSet.has(sym.id);
          return (
            <button key={sym.id} type="button" onClick={() => toggle(sym.id)}
              title={sym.name}
              className={`relative flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-lg border transition-all duration-150 min-h-[72px] group
                ${isSelected
                  ? "border-primary bg-primary/8 shadow-[inset_0_0_0_1px] shadow-primary/15"
                  : "border-border hover:border-primary/25 hover:bg-secondary/50"}`}>
              {isSelected && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                  <Check size={8} className="text-white" />
                </span>
              )}
              <div className={`transition-opacity ${isSelected ? "opacity-100" : "opacity-65 group-hover:opacity-85"}`}>
                <SymbolSVG symbol={sym} size={28} />
              </div>
              <p className={`text-[9px] text-center leading-tight line-clamp-2 font-medium px-0.5
                ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {sym.name}
              </p>
            </button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground text-center" style={{ fontFamily: "'DM Mono', monospace" }}>
          Tap symbols from this garment's care label
        </p>
      )}
    </div>
  );
}

// ─── Garment Row (expandable inline edit) ────────────────────────────────────
function GarmentRow({ garment, onUpdate, onDelete, onToggleFavorite }: {
  garment: Garment; onUpdate: (g: Garment) => void;
  onDelete: (id: string) => void; onToggleFavorite: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ ...garment, selectedSymbols: garment.selectedSymbols ?? [] });
  const set = <K extends keyof Garment>(k: K, v: Garment[K]) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => { setForm({ ...garment, selectedSymbols: garment.selectedSymbols ?? [] }); }, [garment.id]);

  const colorGroups: ColorGroup[] = ["white", "light", "dark", "bright"];
  const fabrics: FabricType[] = ["cotton", "wool", "silk", "synthetic", "denim", "linen", "blend"];
  const temps: WashTemp[] = ["cold", "warm", "hot"];

  const hasChanges = useMemo(() => {
    const symPrev = garment.selectedSymbols ?? [];
    const symNext = form.selectedSymbols ?? [];
    const symsChanged = symPrev.length !== symNext.length || symPrev.some(s => !symNext.includes(s));
    return (
      form.name !== garment.name || form.colorGroup !== garment.colorGroup ||
      form.fabricType !== garment.fabricType || form.washTemp !== garment.washTemp ||
      form.isDelicate !== garment.isDelicate || form.handWashOnly !== garment.handWashOnly ||
      form.dryerSafe !== garment.dryerSafe || symsChanged
    );
  }, [form, garment]);

  const changes = useMemo(() => {
    const diffs: string[] = [];
    if (garment.name !== form.name) diffs.push(`Name: "${garment.name}" → "${form.name}"`);
    if (garment.washTemp !== form.washTemp) diffs.push(`Wash temp: ${TEMP_LABELS[garment.washTemp].split(" · ")[0]} → ${TEMP_LABELS[form.washTemp].split(" · ")[0]}`);
    if (garment.fabricType !== form.fabricType) diffs.push(`Fabric: ${FABRIC_LABELS[garment.fabricType]} → ${FABRIC_LABELS[form.fabricType]}`);
    if (garment.colorGroup !== form.colorGroup) diffs.push(`Color: ${COLOR_LABELS[garment.colorGroup]} → ${COLOR_LABELS[form.colorGroup]}`);
    if (garment.isDelicate !== form.isDelicate) diffs.push(`Delicate: ${garment.isDelicate ? "On" : "Off"} → ${form.isDelicate ? "On" : "Off"}`);
    if (garment.handWashOnly !== form.handWashOnly) diffs.push(`Hand wash: ${garment.handWashOnly ? "Required" : "Off"} → ${form.handWashOnly ? "Required" : "Off"}`);
    if (garment.dryerSafe !== form.dryerSafe) diffs.push(`Dryer: ${garment.dryerSafe ? "Safe" : "Avoid"} → ${form.dryerSafe ? "Safe" : "Avoid"}`);
    const prevSyms = garment.selectedSymbols ?? [];
    const nextSyms = form.selectedSymbols ?? [];
    const added = nextSyms.filter(s => !prevSyms.includes(s));
    const removed = prevSyms.filter(s => !nextSyms.includes(s));
    if (added.length > 0) diffs.push(`Symbols added: ${added.map(id => CARE_SYMBOLS.find(s => s.id === id)?.name ?? id).join(", ")}`);
    if (removed.length > 0) diffs.push(`Symbols removed: ${removed.map(id => CARE_SYMBOLS.find(s => s.id === id)?.name ?? id).join(", ")}`);
    return diffs;
  }, [form, garment]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onUpdate({ ...form });
    setExpanded(false);
  };

  const handleDiscard = () => { setForm({ ...garment }); setExpanded(false); };

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${expanded ? "border-primary/40 shadow-md" : "border-border hover:border-primary/20"}`}>
      {/* Summary row — click to expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(v => !v); } }}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 cursor-pointer select-none"
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${garment.name}`}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLOR_SWATCHES[garment.colorGroup] + "35" }}>
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_SWATCHES[garment.colorGroup] }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{garment.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{FABRIC_LABELS[garment.fabricType]}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-mono" style={{ color: TEMP_COLORS[garment.washTemp] }}>{TEMP_LABELS[garment.washTemp]}</span>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap items-center">
            {garment.isDelicate && <Badge variant="amber">Delicate</Badge>}
            {garment.handWashOnly && <Badge variant="amber">Hand Wash</Badge>}
            {!garment.dryerSafe && <Badge>No Dryer</Badge>}
            {(garment.selectedSymbols ?? []).length > 0 && (
              <span className="flex items-center gap-0.5 ml-0.5">
                {(garment.selectedSymbols ?? []).slice(0, 5).map(id => {
                  const sym = CARE_SYMBOLS.find(s => s.id === id);
                  return sym ? (
                    <span key={id} title={sym.name} className="opacity-60">
                      <SymbolSVG symbol={sym} size={14} />
                    </span>
                  ) : null;
                })}
                {(garment.selectedSymbols ?? []).length > 5 && (
                  <span className="text-[10px] font-mono text-muted-foreground ml-0.5">+{(garment.selectedSymbols ?? []).length - 5}</span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0 items-center">
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(garment.id); }}
            aria-label={`${garment.isFavorite ? "Unmark" : "Mark"} ${garment.name} as regular`}
            className={`p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${garment.isFavorite ? "text-[#9B6E3A]" : "text-muted-foreground hover:text-[#9B6E3A]"}`}>
            <Star size={14} className={garment.isFavorite ? "fill-[#9B6E3A]" : ""} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(garment.id); }}
            aria-label={`Delete ${garment.name}`}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Trash2 size={14} />
          </button>
          <span className={`ml-1 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <ChevronDown size={15} />
          </span>
        </div>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="border-t border-border px-4 sm:px-5 pt-5 pb-5 space-y-5">
          {/* Name */}
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">Garment Name</p>
            <input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. White Oxford Shirt"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>

          {/* Color Group */}
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">Color Group</p>
            <div className="grid grid-cols-2 gap-2">
              {colorGroups.map(c => (
                <button key={c} type="button" onClick={() => set("colorGroup", c)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-all duration-150 min-h-[44px]
                    ${form.colorGroup === c ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted hover:text-foreground"}`}>
                  <span className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: COLOR_SWATCHES[c] }} />
                  <span className="leading-tight">{COLOR_LABELS[c]}</span>
                  {form.colorGroup === c && <Check size={12} className="ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Fabric Type */}
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">Fabric Type</p>
            <div className="flex flex-wrap gap-1.5">
              {fabrics.map(f => (
                <button key={f} type="button" onClick={() => set("fabricType", f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 min-h-[36px]
                    ${form.fabricType === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                  {FABRIC_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Wash Temp */}
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">Max Wash Temperature</p>
            <div className="grid grid-cols-3 gap-2">
              {temps.map(t => (
                <button key={t} type="button" onClick={() => set("washTemp", t)}
                  className={`py-2.5 px-2 rounded-lg border text-xs font-medium transition-all duration-150 min-h-[56px] flex flex-col items-center justify-center gap-1
                    ${form.washTemp === t ? "border-primary bg-primary/5" : "border-border text-muted-foreground hover:border-muted hover:text-foreground"}`}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TEMP_COLORS[t] }} />
                  <span className={`text-center leading-tight ${form.washTemp === t ? "text-primary" : ""}`}>
                    <span className="block">{t === "cold" ? "Cold" : t === "warm" ? "Warm" : "Hot"}</span>
                    <span className="block font-mono opacity-70">{t === "cold" ? "30°C" : t === "warm" ? "40°C" : "60°C"}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Special Care */}
          <div>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">Special Care</p>
            <div className="divide-y divide-border">
              <Toggle checked={form.isDelicate} onChange={v => set("isDelicate", v)} label="Delicate — handle with extra care" />
              <Toggle checked={form.handWashOnly} onChange={v => set("handWashOnly", v)} label="Hand wash only" />
              <Toggle checked={form.dryerSafe} onChange={v => set("dryerSafe", v)} label="Dryer safe" />
            </div>
          </div>

          {/* Care Label Symbols */}
          <InlineSymbolPicker
            selected={form.selectedSymbols ?? []}
            onChange={vals => set("selectedSymbols", vals)}
          />

          {/* Change summary */}
          {hasChanges && changes.length > 0 && (
            <div className="bg-amber-50 border border-[#B85C38]/20 rounded-xl px-4 py-3">
              <p className="text-[10px] font-mono tracking-widest text-[#B85C38] uppercase mb-2">Unsaved Changes</p>
              <ul className="space-y-1">
                {changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B85C38] flex-shrink-0 mt-1.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasChanges && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info size={12} className="flex-shrink-0" /> No changes yet — modify fields above to edit.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Btn onClick={handleDiscard} variant="secondary" size="sm" className="flex-shrink-0">Discard</Btn>
            <Btn onClick={handleSave} variant="primary" size="sm" disabled={!form.name.trim() || !hasChanges} className="flex-1 justify-center">
              <Check size={14} /> Save Changes
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Garment List View ────────────────────────────────────────────────────────
function GarmentListView({ garments, onAdd, onUpdate, onEdit, onDelete, onGeneratePlan, onToggleFavorite }: {
  garments: Garment[]; onAdd: () => void; onUpdate: (g: Garment) => void;
  onEdit: (g: Garment) => void; onDelete: (id: string) => void;
  onGeneratePlan: () => void; onToggleFavorite: (id: string) => void;
}) {
  return (
    <PageShell>
      <div className="flex items-end justify-between mb-6 sm:mb-8">
        <div>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-1.5">My Wardrobe</p>
          <h1 className="text-2xl sm:text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            {garments.length} {garments.length === 1 ? "Garment" : "Garments"}
          </h1>
        </div>
        <Btn onClick={onAdd} variant="primary" size="sm" className="flex-shrink-0"><Plus size={15} /> Add</Btn>
      </div>

      <FrequentItemsSection garments={garments} onEdit={onEdit} />

      {garments.length === 0 ? (
        <div className="text-center py-20">
          <Shirt size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">Your wardrobe is empty.</p>
          <Btn onClick={onAdd} variant="primary"><Plus size={16} /> Add First Garment</Btn>
        </div>
      ) : (
        <>
          <div className="space-y-2.5 sm:space-y-3 mb-8 sm:mb-10">
            {garments.map(g => (
              <GarmentRow key={g.id} garment={g} onUpdate={onUpdate} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
          <div className="bg-primary rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-primary-foreground font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Ready to plan your laundry?</h3>
                <p className="text-primary-foreground/70 text-sm mt-0.5">Generate optimized loads from your {garments.length} garments.</p>
              </div>
              <Btn onClick={onGeneratePlan} variant="secondary" className="sm:flex-shrink-0 bg-white/15 text-white hover:bg-white/25 border-0 justify-center sm:justify-start">
                Generate Plan <Sparkles size={15} />
              </Btn>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}

// ─── Priority Mode Selection ──────────────────────────────────────────────────
function PriorityModeView({ selected, onSelect, onGenerate, garmentCount }: {
  selected: PriorityMode; onSelect: (m: PriorityMode) => void; onGenerate: () => void; garmentCount: number;
}) {
  const modes: { id: PriorityMode; icon: React.ReactNode; title: string; subtitle: string; desc: string; detail: string[] }[] = [
    { id: "max-protection", icon: <Shield size={22} />, title: "Maximum Protection", subtitle: "Most loads — safest results", desc: "Separates garments by color, delicacy, and exact temperature. No garment is compromised.", detail: ["Each color group washed separately", "Delicates always isolated", "Exact wash temperature per garment", "Best for new or precious items"] },
    { id: "balanced", icon: <WashingMachineIcon size={22} />, title: "Balanced", subtitle: "Fewer loads — smart groupings", desc: "Groups whites, lights, and darks intelligently. Merges compatible fabrics to reduce loads without sacrificing care.", detail: ["Whites separated from colors", "Delicates kept apart", "Compatible temps merged", "Best for everyday laundry"] },
    { id: "minimize-loads", icon: <Layers size={22} />, title: "Minimize Loads", subtitle: "Fewest loads — maximum efficiency", desc: "Combines garments into as few loads as possible. Some compromises made for efficiency.", detail: ["3 loads maximum", "Lights, darks, whites grouped broadly", "Uses coolest safe temperature", "Best for quick wash days"] },
  ];
  return (
    <PageShell>
      <SectionHeader eyebrow="Laundry Plan" title="Choose Your Priority" subtitle="How should ThreadCare balance care quality with laundry efficiency?" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
        {modes.map(m => (
          <button key={m.id} onClick={() => onSelect(m.id)}
            className={`text-left rounded-2xl border-2 p-5 sm:p-6 transition-all duration-200 active:scale-[0.99] ${selected === m.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${selected === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{m.icon}</div>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{m.title}</h3>
              {selected === m.id && <CheckCircle2 size={18} className="text-primary flex-shrink-0 ml-2 mt-0.5" />}
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-2 sm:mb-3">{m.subtitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4">{m.desc}</p>
            <ul className="space-y-1.5">
              {m.detail.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check size={12} className={`mt-0.5 flex-shrink-0 ${selected === m.id ? "text-primary" : "text-muted-foreground/50"}`} />{d}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-xl px-4 sm:px-5 py-4">
        <p className="text-sm text-muted-foreground">Planning for <span className="font-medium text-foreground font-mono">{garmentCount}</span> garments</p>
        <Btn onClick={onGenerate} variant="primary" disabled={garmentCount === 0} className="justify-center sm:justify-start">
          <Sparkles size={16} /> Generate Plan
        </Btn>
      </div>
    </PageShell>
  );
}

// ─── Save Plan Bottom Sheet ───────────────────────────────────────────────────
function SavePlanSheet({ isOpen, plan, mode, onSave, onClose }: {
  isOpen: boolean; plan: LaundryPlan; mode: PriorityMode; onSave: (name: string) => void; onClose: () => void;
}) {
  const defaultName = `Laundry Plan — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const [name, setName] = useState(defaultName);

  useEffect(() => { if (isOpen) setName(defaultName); }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <div className="absolute bottom-0 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Save this Plan</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary min-w-[36px] min-h-[36px] flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 mb-5 grid grid-cols-3 divide-x divide-border">
          <div className="text-center pr-4"><p className="text-lg font-mono font-medium text-foreground">{plan.loads.length}</p><p className="text-xs text-muted-foreground">Loads</p></div>
          <div className="text-center px-4"><p className="text-lg font-mono font-medium text-foreground">{plan.loads.reduce((s, l) => s + l.garments.length, 0)}</p><p className="text-xs text-muted-foreground">Garments</p></div>
          <div className="text-center pl-4"><p className="text-lg font-mono font-medium text-foreground">{MODE_LABELS[mode].split(" ")[0]}</p><p className="text-xs text-muted-foreground">Mode</p></div>
        </div>
        <label className="block text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">Plan Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px] mb-4"
          style={{ fontFamily: "'DM Sans', sans-serif" }} />
        <div className="flex gap-3">
          <Btn onClick={onClose} variant="secondary" className="flex-shrink-0">Cancel</Btn>
          <Btn onClick={() => onSave(name.trim() || defaultName)} variant="primary" className="flex-1 justify-center">
            <BookmarkCheck size={16} /> Save Plan
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Laundry Plan Results ─────────────────────────────────────────────────────
function LaundryPlanView({ plan, mode, onBack, onRedo, onSave, isSaved }: {
  plan: LaundryPlan; mode: PriorityMode; onBack: () => void; onRedo: () => void;
  onSave: () => void; isSaved: boolean;
}) {
  return (
    <PageShell>
      <div className="flex items-start justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 sm:mb-3 transition-colors min-h-[44px]">
            <ArrowLeft size={14} /> Change Mode
          </button>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-1">Laundry Plan</p>
          <h1 className="text-2xl sm:text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>Your Plan</h1>
        </div>
        <Badge variant="teal">{MODE_LABELS[mode]}</Badge>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border bg-card border border-border rounded-xl overflow-hidden mb-6 sm:mb-8">
        {[{ label: "Loads", value: plan.loads.length, icon: <Layers size={15} /> }, { label: "Machine Wash", value: plan.loads.reduce((s, l) => s + l.garments.length, 0), icon: <WashingMachineIcon size={15} /> }, { label: "Hand Wash", value: plan.handWashItems.length, icon: <DropletIcon size={15} /> }].map((s, i) => (
          <div key={i} className="flex flex-col items-center justify-center py-4 px-2 sm:px-4 gap-1">
            <div className="text-primary">{s.icon}</div>
            <p className="text-xl font-mono font-medium text-foreground">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
        {plan.loads.map((load, i) => (
          <div key={load.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border" style={{ borderLeftWidth: 4, borderLeftColor: load.color, borderLeftStyle: "solid" }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">Load {i + 1}</span>
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs font-mono font-medium" style={{ color: TEMP_COLORS[load.washTemp] }}>{TEMP_LABELS[load.washTemp]}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>{load.name}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">{load.cycle}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">{load.garments.length} items</span>
                </div>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {load.garments.map(g => (
                  <div key={g.id} className="flex items-center gap-1.5 bg-secondary/60 rounded-lg px-2.5 py-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLOR_SWATCHES[g.colorGroup] }} />
                    <span className="text-xs text-foreground font-medium">{g.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 sm:gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ThermometerIcon size={13} /><span className="font-mono">{TEMP_LABELS[load.washTemp]}</span></div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><WashingMachineIcon size={13} /><span>{load.cycle}</span></div>
                {load.garments.some(g => !g.dryerSafe) && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wind size={13} /><span>Air dry some items</span></div>}
              </div>
              {load.warnings.length > 0 && (
                <div className="space-y-2">
                  {load.warnings.map((w, j) => (
                    <div key={j} className="flex items-start gap-2 bg-[#B85C38]/8 border border-[#B85C38]/15 rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="text-accent flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-accent leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {plan.handWashItems.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 sm:mb-8">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border" style={{ borderLeftWidth: 4, borderLeftColor: "#5B7FA6", borderLeftStyle: "solid" }}>
            <DropletIcon size={18} className="text-[#5B7FA6] flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>Hand Wash Separately</h3>
              <p className="text-xs text-muted-foreground">{plan.handWashItems.length} items require hand washing</p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {plan.handWashItems.map(g => (
                <div key={g.id} className="flex items-center gap-1.5 bg-[#5B7FA6]/10 rounded-lg px-2.5 py-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_SWATCHES[g.colorGroup] }} />
                  <span className="text-xs text-foreground font-medium">{g.name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
              <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-relaxed">Gently hand wash each item in cool water with mild detergent. Do not wring — press and lay flat to dry.</p>
            </div>
          </div>
        </div>
      )}

      {plan.loads.length === 0 && plan.handWashItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground"><Shirt size={40} className="mx-auto mb-3 opacity-30" /><p>No garments to plan. Add items to your wardrobe first.</p></div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Btn onClick={onBack} variant="secondary">Change Mode</Btn>
        <Btn onClick={onRedo} variant="ghost"><RefreshCw size={15} /> Re-generate</Btn>
        {!isSaved ? (
          <Btn onClick={onSave} variant="primary" className="ml-auto"><BookmarkCheck size={16} /> Save Plan</Btn>
        ) : (
          <div className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded text-sm font-medium min-h-[44px]">
            <CheckCircle2 size={16} /> Saved!
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── Plan Saved View ──────────────────────────────────────────────────────────
function PlanSavedView({ savedPlan, allSavedPlans, onNewPlan, onGoHome, onViewPlan }: {
  savedPlan: SavedPlan; allSavedPlans: SavedPlan[]; onNewPlan: () => void; onGoHome: () => void;
  onViewPlan: (plan: SavedPlan) => void;
}) {
  return (
    <PageShell>
      {/* Success hero */}
      <div className="text-center py-8 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BookmarkCheck size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>Plan Saved</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">Your laundry plan has been saved. Tap the card below to view the full breakdown.</p>
      </div>

      {/* Saved plan summary card — tappable */}
      <button onClick={() => onViewPlan(savedPlan)}
        className="w-full text-left bg-card border border-primary/20 rounded-2xl p-5 mb-8 relative overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 active:scale-[0.99] group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full translate-x-8 -translate-y-8" />
        <div className="flex items-start gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Bookmark size={18} className="text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{savedPlan.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{savedPlan.date}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="teal">{savedPlan.loadCount} loads</Badge>
              <Badge variant="default">{savedPlan.garmentCount} garments</Badge>
              <Badge variant="teal">{MODE_LABELS[savedPlan.mode]}</Badge>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity flex-shrink-0">
            View <ChevronRight size={13} />
          </span>
        </div>
      </button>

      {/* All saved plans */}
      {allSavedPlans.length > 1 && (
        <div className="mb-8">
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">All Saved Plans</p>
          <div className="space-y-2">
            {allSavedPlans.map(plan => (
              <button key={plan.id} onClick={() => onViewPlan(plan)}
                className={`w-full flex items-center gap-3 bg-card border rounded-xl px-4 py-3.5 text-left hover:shadow-sm transition-all duration-150 active:scale-[0.99] ${plan.id === savedPlan.id ? "border-primary/30 bg-primary/3 hover:border-primary/50" : "border-border hover:border-primary/30"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${plan.id === savedPlan.id ? "bg-primary/15" : "bg-secondary"}`}>
                  <Bookmark size={14} className={plan.id === savedPlan.id ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{plan.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{plan.date} · {plan.loadCount} loads</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {plan.id === savedPlan.id && <Badge variant="teal">New</Badge>}
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Btn onClick={onGoHome} variant="secondary" className="flex-1 justify-center"><Home size={16} /> Back to Home</Btn>
        <Btn onClick={onNewPlan} variant="primary" className="flex-1 justify-center"><Sparkles size={16} /> New Plan</Btn>
      </div>
    </PageShell>
  );
}

// ─── Care Tag Upload View ─────────────────────────────────────────────────────
function TagUploadView({ onAnalyze, onSkip }: { onAnalyze: (imageUrl: string) => void; onSkip: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 sm:pb-0">
      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        <button onClick={onSkip} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors min-h-[44px]">
          <ArrowLeft size={14} /> Back to Form
        </button>
        <SectionHeader eyebrow="Wardrobe" title="Scan Care Tag" subtitle="Upload a photo of the care label to auto-fill garment details." />

        {/* Upload area */}
        {!previewUrl ? (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center mb-6 transition-colors duration-150 ${isDragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Tag size={24} className="text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Upload a care label photo</p>
            <p className="text-sm text-muted-foreground mb-5">Drag & drop or choose a file from your device</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Btn onClick={() => fileInputRef.current?.click()} variant="primary"><Upload size={16} /> Choose Image</Btn>
              <Btn onClick={() => fileInputRef.current?.click()} variant="secondary"><Camera size={16} /> Take Photo</Btn>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
          </div>
        ) : (
          <div className="mb-6">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card aspect-video flex items-center justify-center mb-4">
              <img src={previewUrl} alt="Care tag preview" className="max-w-full max-h-full object-contain" />
              <button onClick={() => setPreviewUrl(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
              <ImageIcon size={14} className="text-primary flex-shrink-0" />
              <p className="text-xs text-primary">Image uploaded. Ready to analyze care symbols.</p>
            </div>
          </div>
        )}

        {/* Auto recognition preview */}
        <div className="bg-[#5B7FA6]/5 border border-[#5B7FA6]/20 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#5B7FA6]/10 flex items-center justify-center flex-shrink-0"><Cpu size={16} className="text-[#5B7FA6]" /></div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>Auto Symbol Recognition</p>
                <Badge variant="future">Coming Soon</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">In a future version, ThreadCare will use on-device computer vision to automatically identify every symbol on your care label in real time — no manual selection needed.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Btn onClick={onSkip} variant="secondary">Skip for now</Btn>
          <Btn onClick={() => previewUrl ? onAnalyze(previewUrl) : fileInputRef.current?.click()} variant="primary" className="flex-1 justify-center">
            <Zap size={16} /> {previewUrl ? "Analyze Tag" : "Upload to Analyze"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Detected Symbols Review View ────────────────────────────────────────────
function DetectedSymbolsReview({ imageUrl, detectedSymbols, onConfirm, onCancel }: {
  imageUrl: string; detectedSymbols: DetectedSymbol[];
  onConfirm: (symbols: DetectedSymbol[]) => void; onCancel: () => void;
}) {
  const [symbols, setSymbols] = useState(detectedSymbols);
  const catLabels: Record<string, string> = { washing: "Washing", drying: "Drying", ironing: "Ironing", bleaching: "Bleaching", professional: "Professional" };

  const toggle = (idx: number, value: boolean) => {
    setSymbols(prev => prev.map((s, i) => i === idx ? { ...s, confirmed: value } : s));
  };
  const confirmAll = () => setSymbols(prev => prev.map(s => ({ ...s, confirmed: true })));
  const confirmedCount = symbols.filter(s => s.confirmed === true).length;

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 sm:pb-0">
      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors min-h-[44px]">
          <ArrowLeft size={14} /> Back to Upload
        </button>
        <SectionHeader eyebrow="Tag Analysis" title="Review Detected Symbols" subtitle="Confirm the symbols found on your care label before applying them." />

        {/* Image thumbnail */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 mb-5">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary"><img src={imageUrl} alt="Scanned care tag" className="w-full h-full object-cover" /></div>
          <div>
            <p className="font-medium text-foreground text-sm">Scanned care label</p>
            <p className="text-xs text-muted-foreground">{symbols.length} symbols detected · {Math.round(symbols.reduce((s, d) => s + d.confidence, 0) / symbols.length * 100)}% avg. confidence</p>
          </div>
          <button onClick={confirmAll} className="ml-auto text-xs text-primary font-medium hover:underline min-h-[36px] px-2">Confirm all</button>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 bg-[#9B6E3A]/8 border border-[#9B6E3A]/20 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle size={13} className="text-[#9B6E3A] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#9B6E3A] leading-relaxed">This is a prototype demonstration — symbols are mocked, not actually detected by a model. Review carefully before applying.</p>
        </div>

        {/* Symbol list */}
        <div className="space-y-3 mb-7">
          {symbols.map((d, idx) => (
            <div key={d.symbol.id}
              className={`flex items-center gap-4 bg-card border rounded-xl px-4 py-4 transition-all duration-150 ${d.confirmed === true ? "border-primary/30 bg-primary/3" : d.confirmed === false ? "border-border opacity-50" : "border-border"}`}>
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-primary"><SymbolSVG symbol={d.symbol} size={36} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm">{d.symbol.name}</p>
                  <Badge variant="default">{catLabels[d.symbol.category]}</Badge>
                </div>
                {/* Confidence bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${d.confidence * 100}%`, backgroundColor: d.confidence > 0.8 ? "#2E5C50" : d.confidence > 0.65 ? "#9B6E3A" : "#B03030" }} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{Math.round(d.confidence * 100)}%</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => toggle(idx, false)} aria-label="Reject symbol"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${d.confirmed === false ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}>
                  <X size={14} />
                </button>
                <button onClick={() => toggle(idx, true)} aria-label="Confirm symbol"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${d.confirmed === true ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
                  <Check size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Btn onClick={onCancel} variant="secondary">Cancel</Btn>
          <Btn onClick={() => onConfirm(symbols)} variant="primary" disabled={confirmedCount === 0} className="flex-1 justify-center">
            Apply {confirmedCount > 0 ? `${confirmedCount} Symbol${confirmedCount > 1 ? "s" : ""}` : "Symbols"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Saved Plan Detail View ───────────────────────────────────────────────────
function SavedPlanDetailView({ savedPlan, onBack, onNewPlan }: {
  savedPlan: SavedPlan; onBack: () => void; onNewPlan: () => void;
}) {
  const { plan, mode } = savedPlan;
  return (
    <PageShell>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors min-h-[44px]">
        <ArrowLeft size={14} /> Back to Saved Plans
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-1">Saved Plan</p>
          <h1 className="text-2xl sm:text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>{savedPlan.name}</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">{savedPlan.date}</p>
        </div>
        <Badge variant="teal">{MODE_LABELS[mode]}</Badge>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-border bg-card border border-border rounded-xl overflow-hidden mb-6 sm:mb-8">
        {[
          { label: "Loads", value: plan.loads.length, icon: <Layers size={15} /> },
          { label: "Machine Wash", value: plan.loads.reduce((s, l) => s + l.garments.length, 0), icon: <WashingMachineIcon size={15} /> },
          { label: "Hand Wash", value: plan.handWashItems.length, icon: <DropletIcon size={15} /> },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center justify-center py-4 px-2 sm:px-4 gap-1">
            <div className="text-primary">{s.icon}</div>
            <p className="text-xl font-mono font-medium text-foreground">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Load cards */}
      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
        {plan.loads.map((load, i) => (
          <div key={load.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border" style={{ borderLeftWidth: 4, borderLeftColor: load.color, borderLeftStyle: "solid" }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">Load {i + 1}</span>
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs font-mono font-medium" style={{ color: TEMP_COLORS[load.washTemp] }}>{TEMP_LABELS[load.washTemp]}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>{load.name}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">{load.cycle}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">{load.garments.length} items</span>
                </div>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {load.garments.map(g => (
                  <div key={g.id} className="flex items-center gap-1.5 bg-secondary/60 rounded-lg px-2.5 py-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLOR_SWATCHES[g.colorGroup] }} />
                    <span className="text-xs text-foreground font-medium">{g.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 sm:gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ThermometerIcon size={13} /><span className="font-mono">{TEMP_LABELS[load.washTemp]}</span></div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><WashingMachineIcon size={13} /><span>{load.cycle}</span></div>
                {load.garments.some(g => !g.dryerSafe) && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wind size={13} /><span>Air dry some items</span></div>}
              </div>
              {load.warnings.length > 0 && (
                <div className="space-y-2">
                  {load.warnings.map((w, j) => (
                    <div key={j} className="flex items-start gap-2 bg-[#B85C38]/8 border border-[#B85C38]/15 rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="text-accent flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-accent leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Hand wash section */}
      {plan.handWashItems.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 sm:mb-8">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border" style={{ borderLeftWidth: 4, borderLeftColor: "#5B7FA6", borderLeftStyle: "solid" }}>
            <DropletIcon size={18} className="text-[#5B7FA6] flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>Hand Wash Separately</h3>
              <p className="text-xs text-muted-foreground">{plan.handWashItems.length} items require hand washing</p>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {plan.handWashItems.map(g => (
                <div key={g.id} className="flex items-center gap-1.5 bg-[#5B7FA6]/10 rounded-lg px-2.5 py-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_SWATCHES[g.colorGroup] }} />
                  <span className="text-xs text-foreground font-medium">{g.name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
              <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-relaxed">Gently hand wash each item in cool water with mild detergent. Do not wring — press and lay flat to dry.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Btn onClick={onBack} variant="secondary"><ArrowLeft size={15} /> All Plans</Btn>
        <Btn onClick={onNewPlan} variant="primary" className="ml-auto"><Sparkles size={15} /> New Plan</Btn>
      </div>
    </PageShell>
  );
}

// ─── Feedback View ───────────────────────────────────────────────────────────
type FeedbackType = "general" | "bug" | "feature" | "other";
type FeedbackRating = 1 | 2 | 3 | 4 | 5;

function FeedbackView({ onBack }: { onBack: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", feedbackType: "general" as FeedbackType,
    rating: 0 as number, message: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const feedbackTypes: { id: FeedbackType; label: string; desc: string }[] = [
    { id: "general", label: "General", desc: "Overall impressions" },
    { id: "feature", label: "Feature Request", desc: "Something you'd love" },
    { id: "bug", label: "Bug Report", desc: "Something went wrong" },
    { id: "other", label: "Other", desc: "Anything else" },
  ];

  const ratingLabels: Record<number, string> = {
    1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent",
  };

  const handleSubmit = () => {
    if (!form.message.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <PageShell>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors min-h-[44px]">
          <ArrowLeft size={14} /> Back to Home
        </button>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <SmilePlus size={30} className="text-accent" />
          </div>
          <h1 className="text-2xl sm:text-3xl text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            Thank you, {form.name || "friend"}!
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Your feedback helps make ThreadCare better for everyone. We read every submission and genuinely appreciate you taking the time.
          </p>
          <div className="bg-card border border-border rounded-2xl p-5 text-left mb-8">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Your Submission</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">Type</span>
                <span className="text-xs text-foreground font-medium capitalize">{feedbackTypes.find(f => f.id === form.feedbackType)?.label}</span>
              </div>
              {form.rating > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">Rating</span>
                  <span className="text-xs text-foreground font-medium">{"★".repeat(form.rating)}{"☆".repeat(5 - form.rating)} · {ratingLabels[form.rating]}</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">Message</span>
                <span className="text-xs text-foreground leading-relaxed">{form.message}</span>
              </div>
            </div>
          </div>
          <Btn onClick={onBack} variant="primary" className="w-full justify-center"><Home size={16} /> Back to Home</Btn>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors min-h-[44px]">
        <ArrowLeft size={14} /> Back to Home
      </button>

      <div className="max-w-2xl">
        <div className="mb-7 sm:mb-9">
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">Feedback</p>
          <h1 className="text-2xl sm:text-3xl text-foreground mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            Share Your Thoughts
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Your feedback shapes the future of ThreadCare. We read every message.</p>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Personal info */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-4">Your Information <span className="text-muted-foreground/50 normal-case font-sans tracking-normal">(optional)</span></p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="fb-name" className="block text-xs text-muted-foreground mb-1.5">Name</label>
                <input id="fb-name" value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }} />
              </div>
              <div>
                <label htmlFor="fb-email" className="block text-xs text-muted-foreground mb-1.5">Email</label>
                <input id="fb-email" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }} />
              </div>
            </div>
          </div>

          {/* Feedback type */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-4">Feedback Type</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {feedbackTypes.map(t => (
                <button key={t.id} type="button" onClick={() => set("feedbackType", t.id)}
                  className={`flex flex-col items-start px-3.5 py-3 rounded-xl border text-left transition-all duration-150 min-h-[68px]
                    ${form.feedbackType === t.id ? "border-accent/50 bg-accent/8 text-accent" : "border-border text-muted-foreground hover:border-muted hover:text-foreground"}`}>
                  <span className="text-sm font-medium leading-snug">{t.label}</span>
                  <span className="text-[10px] mt-0.5 opacity-70">{t.desc}</span>
                  {form.feedbackType === t.id && <Check size={11} className="mt-auto ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Star rating */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-4">
              Overall Rating <span className="text-muted-foreground/50 normal-case font-sans tracking-normal">(optional)</span>
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => set("rating", form.rating === n ? 0 : n)}
                  className={`text-2xl transition-all duration-100 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:scale-110 active:scale-95
                    ${n <= form.rating ? "text-[#9B6E3A]" : "text-muted-foreground/30 hover:text-muted-foreground/60"}`}>
                  ★
                </button>
              ))}
              {form.rating > 0 && (
                <span className="text-sm text-muted-foreground ml-2 font-medium">{ratingLabels[form.rating]}</span>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <label htmlFor="fb-message" className="block text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-4">
              Your Feedback <span className="text-accent/60 normal-case font-sans tracking-normal">*</span>
            </label>
            <textarea id="fb-message" value={form.message} onChange={e => set("message", e.target.value)}
              placeholder="Tell us what you think, what you'd improve, or anything on your mind…"
              rows={5}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }} />
            <p className="text-[10px] text-muted-foreground mt-2 text-right font-mono">{form.message.length} characters</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 sm:mt-7">
          <Btn onClick={onBack} variant="secondary" className="flex-shrink-0">Cancel</Btn>
          <Btn onClick={handleSubmit} variant="primary" disabled={!form.message.trim()} className="flex-1 justify-center">
            <Send size={15} /> Submit Feedback
          </Btn>
        </div>
      </div>
    </PageShell>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  const [mainView, setMainView] = useState<MainView>("home");
  const [symbolsSubview, setSymbolsSubview] = useState<SymbolsSubview>("guide");
  const [selectedSymbol, setSelectedSymbol] = useState<CareSymbol | null>(null);
  const [wardrobeSubview, setWardrobeSubview] = useState<WardrobeSubview>("list");
  const [editingGarment, setEditingGarment] = useState<Garment | undefined>();
  const [planSubview, setPlanSubview] = useState<PlanSubview>("priority");
  const [garments, setGarments] = useState<Garment[]>(INITIAL_GARMENTS);
  const [priorityMode, setPriorityMode] = useState<PriorityMode>("balanced");
  const [laundryPlan, setLaundryPlan] = useState<LaundryPlan | null>(null);

  // New state for added features
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [currentSavedPlan, setCurrentSavedPlan] = useState<SavedPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<SavedPlan | null>(null);
  const [isPlanSaved, setIsPlanSaved] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [tagImageUrl, setTagImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedSymbols, setDetectedSymbols] = useState<DetectedSymbol[] | null>(null);
  const [scannedSymbols, setScannedSymbols] = useState<DetectedSymbol[] | undefined>();

  const navigate = (v: MainView) => {
    setMainView(v);
    if (v === "wardrobe") setWardrobeSubview("list");
    if (v === "symbols") setSymbolsSubview("guide");
    if (v === "plan") { setPlanSubview("saved"); setIsPlanSaved(false); setCurrentSavedPlan(null); setViewingPlan(null); }
  };

  const handleSelectSymbol = (s: CareSymbol) => { setSelectedSymbol(s); setSymbolsSubview("detail"); };
  const handleEditGarment = (g: Garment) => { setEditingGarment(g); setScannedSymbols(undefined); setWardrobeSubview("form"); };
  const handleAddGarment = () => { setEditingGarment(undefined); setScannedSymbols(undefined); setWardrobeSubview("form"); };
  const handleSaveGarment = (g: Garment) => {
    setGarments(prev => editingGarment ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]);
    setWardrobeSubview("list");
  };
  const handleDeleteGarment = (id: string) => setGarments(prev => prev.filter(g => g.id !== id));
  const handleUpdateGarment = (g: Garment) => setGarments(prev => prev.map(x => x.id === g.id ? g : x));
  const handleToggleFavorite = (id: string) => setGarments(prev => prev.map(g => g.id === id ? { ...g, isFavorite: !g.isFavorite } : g));

  const handleGeneratePlan = () => {
    setLaundryPlan(generateLaundryPlan(garments, priorityMode));
    setIsPlanSaved(false);
    setPlanSubview("results");
  };
  const handleGoToPlan = () => { setMainView("plan"); setPlanSubview("priority"); };

  const handleSavePlan = (name: string) => {
    if (!laundryPlan) return;
    const plan: SavedPlan = {
      id: generateId(), name,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      mode: priorityMode,
      loadCount: laundryPlan.loads.length,
      garmentCount: garments.length,
      plan: laundryPlan,
    };
    setSavedPlans(prev => [plan, ...prev]);
    setCurrentSavedPlan(plan);
    setIsPlanSaved(true);
    setShowSaveSheet(false);
    setPlanSubview("saved");
  };

  const handleViewPlan = (plan: SavedPlan) => { setViewingPlan(plan); setPlanSubview("saved-detail"); };

  // Tag upload + mock analysis flow
  const handleScanTag = () => { setTagImageUrl(null); setDetectedSymbols(null); setWardrobeSubview("tag-upload"); };
  const handleAnalyzeTag = (imageUrl: string) => {
    setTagImageUrl(imageUrl);
    setIsAnalyzing(true);
    // Simulate CV analysis delay
    setTimeout(() => {
      setDetectedSymbols(MOCK_DETECTED_SYMBOLS.map(d => ({ ...d })));
      setIsAnalyzing(false);
      setWardrobeSubview("symbol-review");
    }, 1600);
  };

  const handleConfirmSymbols = (symbols: DetectedSymbol[]) => {
    setScannedSymbols(symbols);
    setWardrobeSubview("form");
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <NavBar view={mainView} onNav={navigate} garmentCount={garments.length} />

      {mainView === "home" && (
        <HomeView garmentCount={garments.length} onNav={navigate} savedPlans={savedPlans} onViewSaved={() => { setMainView("plan"); setPlanSubview("saved"); }} onViewPlan={plan => { setViewingPlan(plan); setMainView("plan"); setPlanSubview("saved-detail"); }} />
      )}

      {mainView === "symbols" && (
        symbolsSubview === "guide"
          ? <SymbolGuideView onSelect={handleSelectSymbol} />
          : selectedSymbol && <SymbolDetailView symbol={selectedSymbol} onBack={() => setSymbolsSubview("guide")} />
      )}

      {mainView === "wardrobe" && (
        wardrobeSubview === "list" ? (
          <GarmentListView garments={garments} onAdd={handleAddGarment} onUpdate={handleUpdateGarment} onEdit={handleEditGarment} onDelete={handleDeleteGarment} onGeneratePlan={handleGoToPlan} onToggleFavorite={handleToggleFavorite} />
        ) : wardrobeSubview === "form" ? (
          <GarmentForm editing={editingGarment} onSave={handleSaveGarment} onCancel={() => setWardrobeSubview("list")} onScanTag={handleScanTag} scannedSymbols={scannedSymbols} />
        ) : wardrobeSubview === "tag-upload" ? (
          isAnalyzing ? (
            <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                <p className="text-foreground font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>Analyzing care symbols…</p>
                <p className="text-muted-foreground text-sm mt-1">This may take a moment</p>
              </div>
            </div>
          ) : (
            <TagUploadView onAnalyze={handleAnalyzeTag} onSkip={() => setWardrobeSubview("form")} />
          )
        ) : wardrobeSubview === "symbol-review" && detectedSymbols && tagImageUrl ? (
          <DetectedSymbolsReview imageUrl={tagImageUrl} detectedSymbols={detectedSymbols} onConfirm={handleConfirmSymbols} onCancel={() => setWardrobeSubview("tag-upload")} />
        ) : null
      )}

      {mainView === "plan" && (
        planSubview === "priority" ? (
          <PriorityModeView selected={priorityMode} onSelect={setPriorityMode} onGenerate={handleGeneratePlan} garmentCount={garments.length} />
        ) : planSubview === "results" && laundryPlan ? (
          <>
            <LaundryPlanView plan={laundryPlan} mode={priorityMode} onBack={() => setPlanSubview("priority")} onRedo={handleGeneratePlan} onSave={() => setShowSaveSheet(true)} isSaved={isPlanSaved} />
            <SavePlanSheet isOpen={showSaveSheet} plan={laundryPlan} mode={priorityMode} onSave={handleSavePlan} onClose={() => setShowSaveSheet(false)} />
          </>
        ) : planSubview === "saved" && currentSavedPlan ? (
          <PlanSavedView savedPlan={currentSavedPlan} allSavedPlans={savedPlans} onNewPlan={() => navigate("wardrobe")} onGoHome={() => navigate("home")} onViewPlan={handleViewPlan} />
        ) : planSubview === "saved" ? (
          <PageShell>
            <SectionHeader eyebrow="Plans" title="Laundry Plans" subtitle="View your saved plans or start a new one." />

            {/* Create New Plan CTA */}
            <button onClick={() => navigate("wardrobe")}
              className="w-full flex items-center gap-4 bg-primary text-primary-foreground rounded-2xl px-5 py-4 mb-6 text-left hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 group">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                <Plus size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Create New Plan</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5">Review your wardrobe, then generate optimized loads</p>
              </div>
              <ChevronRight size={16} className="text-primary-foreground/60 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </button>

            {savedPlans.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <Bookmark size={36} className="mx-auto mb-3 opacity-25" />
                <p className="font-medium text-foreground mb-1">No saved plans yet</p>
                <p className="text-sm">Plans you create and save will appear here.</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Previous Plans</p>
                <div className="space-y-2.5">
                  {savedPlans.map(plan => (
                    <button key={plan.id} onClick={() => handleViewPlan(plan)}
                      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-4 text-left hover:border-primary/30 hover:shadow-sm transition-all duration-150 active:scale-[0.99]">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Bookmark size={15} className="text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{plan.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{plan.date} · {plan.loadCount} loads · {plan.garmentCount} items</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="teal">{MODE_LABELS[plan.mode].split(" ")[0]}</Badge>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </PageShell>
        ) : planSubview === "saved-detail" && viewingPlan ? (
          <SavedPlanDetailView
            savedPlan={viewingPlan}
            onBack={() => { setViewingPlan(null); setPlanSubview(currentSavedPlan ? "saved" : "saved"); }}
            onNewPlan={() => { setViewingPlan(null); navigate("wardrobe"); }}
          />
        ) : null
      )}

      {mainView === "feedback" && (
        <FeedbackView onBack={() => navigate("home")} />
      )}
    </div>
  );
}
