import { useState } from "react";
import { Sun, Moon, Sparkles, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UIPreview() {
  const [mode, setMode] = useState<"light" | "dark">("light");

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-700 p-8",
      mode === "light" ? "bg-white text-black" : "bg-black text-white"
    )}>
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Toggle Controls */}
        <div className="flex justify-between items-center border-b pb-6 border-current/10">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">UI Concept Preview</h1>
            <p className="text-sm opacity-60">Showing {mode === "light" ? "Modern High-Contrast" : "Onyx & Glow"}</p>
          </div>
          <button 
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-full border transition-all font-bold text-xs uppercase tracking-widest",
              mode === "light" 
                ? "bg-black text-white border-black hover:bg-zinc-800" 
                : "bg-white text-black border-white hover:bg-zinc-200"
            )}
          >
            {mode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Switch to {mode === "light" ? "Dark" : "Light"}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Hero Concept */}
          <div className="space-y-6">
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]",
              mode === "light" ? "bg-black text-white" : "bg-zinc-800 text-zinc-300"
            )}>
              Luxury Defined
            </span>
            <h2 className="font-serif text-5xl md:text-6xl leading-[1.1]">
              Timeless <br /> 
              <span className={cn(
                "italic transition-all duration-700",
                mode === "light" ? "text-zinc-400" : "text-brand"
              )}>Craftsmanship</span>
            </h2>
            <p className="opacity-70 max-w-sm text-lg leading-relaxed">
              Experience the new standard of premium accessories, designed for those who demand excellence.
            </p>
            <div className="pt-4">
              <button className={cn(
                "group relative px-8 py-4 rounded-full overflow-hidden transition-all duration-500",
                mode === "light" 
                  ? "bg-black text-white" 
                  : "bg-gradient-to-r from-gold via-brand to-gold bg-[length:200%_auto] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-shimmer"
              )}>
                <span className="relative z-10 flex items-center gap-2 font-black uppercase tracking-widest text-xs">
                  Shop Collection <ShoppingBag className="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>

          {/* Product Card Concept */}
          <div className="relative group">
            <div className={cn(
              "aspect-[4/5] rounded-[2rem] overflow-hidden transition-all duration-700 border",
              mode === "light" 
                ? "bg-zinc-50 border-zinc-200 shadow-2xl" 
                : "bg-zinc-900/50 border-white/10 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            )}>
              {/* Glossy Overlay for Dark Mode */}
              {mode === "dark" && (
                <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent pointer-events-none" />
              )}
              
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className={cn(
                   "w-48 h-48 rounded-full blur-3xl opacity-20",
                   mode === "light" ? "bg-black" : "bg-brand"
                 )} />
                 <Sparkles className={cn(
                   "w-24 h-24 absolute",
                   mode === "light" ? "text-black/5" : "text-brand/20"
                 )} />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Premium Series</p>
                    <h3 className="font-serif text-2xl">Obsidian Chrono</h3>
                  </div>
                  <p className="font-bold text-lg">KSh 4,500</p>
                </div>
              </div>
            </div>
            
            {/* Hover Glow for Dark Mode */}
            {mode === "dark" && (
              <div className="absolute -inset-1 bg-brand/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            )}
          </div>
        </div>

        {/* Component Showcase */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn(
              "h-24 rounded-2xl flex items-center justify-center border transition-all",
              mode === "light" 
                ? "bg-white border-zinc-200 shadow-sm hover:shadow-md" 
                : "bg-zinc-900 border-white/5 hover:border-brand/30"
            )}>
              <div className={cn("w-8 h-8 rounded-full", mode === "light" ? "bg-zinc-100" : "bg-zinc-800")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
