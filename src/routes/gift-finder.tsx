import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronRight, ChevronLeft, Gift, RefreshCw, Sparkles, Heart, Clock, User, Construction } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { FloatingWhatsapp } from "@/components/floating-whatsapp";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/reveal";
import { productsQuery, giftFinderBudgetsQuery, isAdminQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gift-finder")({
  head: () => ({
    meta: [
      { title: "Gift Finder — Phenomenal Products KE" },
      {
        name: "description",
        content: "Find the perfect luxury gift with our interactive gift finder. Personalized recommendations for watches and jewelry.",
      },
      { property: "og:title", content: "Gift Finder — Phenomenal Products KE" },
      { property: "og:description", content: "Discover the perfect gift in seconds." },
    ],
  }),
  component: GiftFinderPage,
});

type Step = {
  id: string;
  question: string;
  icon: any;
  options: {
    label: string;
    value: string;
    description?: string;
  }[];
};

const STEPS: Step[] = [
  {
    id: "recipient",
    question: "Who are you shopping for?",
    icon: User,
    options: [
      { label: "For Him", value: "men", description: "Luxury watches & masculine accessories" },
      { label: "For Her", value: "women", description: "Elegant jewelry & sophisticated timepieces" },
      { label: "For Someone Else", value: "anyone", description: "Unisex gift sets & premium essentials" },
    ],
  },
  {
    id: "occasion",
    question: "What's the occasion?",
    icon: Heart,
    options: [
      { label: "Birthday", value: "birthday" },
      { label: "Anniversary", value: "anniversary" },
      { label: "Wedding", value: "wedding" },
      { label: "Treat Yourself", value: "self" },
      { label: "Just Because", value: "just-because" },
    ],
  },
  {
    id: "style",
    question: "What's their style preference?",
    icon: Sparkles,
    options: [
      { label: "Classic & Timeless", value: "classic", description: "Clean lines and traditional luxury" },
      { label: "Modern & Bold", value: "modern", description: "Contemporary designs that stand out" },
      { label: "Minimalist", value: "minimal", description: "Understated elegance and simplicity" },
      { label: "Statement", value: "statement", description: "High-impact luxury for special moments" },
    ],
  },
  {
    id: "budget",
    question: "Select your budget range",
    icon: Clock,
    options: [], // Populated dynamically
  },
];

function GiftFinderPage() {
  const { user } = useAuth();
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id ?? null));
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const { data: budgets = [] } = useQuery(giftFinderBudgetsQuery);
  const { data: products = [] } = useQuery(productsQuery());

  const dynamicSteps = useMemo(() => {
    return STEPS.map(step => {
      if (step.id === "budget") {
        return {
          ...step,
          options: budgets.map(b => ({
            label: b.label,
            value: b.id,
            description: b.description || undefined
          }))
        };
      }
      return step;
    });
  }, [budgets]);

  const currentStepData = dynamicSteps[currentStep];

  const handleSelect = (stepId: string, value: string) => {
    setSelections((prev) => ({ ...prev, [stepId]: value }));
    if (currentStep < dynamicSteps.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 600);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const reset = () => {
    setCurrentStep(0);
    setSelections({});
    setShowResults(false);
  };

  const filteredProducts = useMemo(() => {
    if (!showResults) return [];

    let list = [...products];

    // Recipient logic (Primary filter)
    if (selections.recipient === "men") {
      list = list.filter(p => p.gender === "male" || p.gender === "unisex");
    } else if (selections.recipient === "women") {
      list = list.filter(p => p.gender === "female" || p.gender === "unisex");
    }

    // Budget logic (Strict filter)
    const selectedBudget = budgets.find(b => b.id === selections.budget);
    if (selectedBudget) {
      list = list.filter(p => {
        const meetsMin = p.price_kes >= selectedBudget.min_price_kes;
        const meetsMax = selectedBudget.max_price_kes ? p.price_kes <= selectedBudget.max_price_kes : true;
        return meetsMin && meetsMax;
      });
    }

    // Style & Occasion Scoring (Relevance ranking)
    const listWithScore = list.map(product => {
      let score = 0;
      const text = `${product.name} ${product.description || ""} ${product.categories?.slug || ""}`.toLowerCase();

      // Style matching
      if (selections.style === "classic" && (text.includes("classic") || text.includes("timeless") || text.includes("leather") || text.includes("gold"))) score += 5;
      if (selections.style === "modern" && (text.includes("modern") || text.includes("bold") || text.includes("black") || text.includes("sport"))) score += 5;
      if (selections.style === "minimal" && (text.includes("minimal") || text.includes("slim") || text.includes("silver") || text.includes("clean"))) score += 5;
      if (selections.style === "statement" && (text.includes("luxury") || text.includes("diamond") || text.includes("premium") || text.includes("large"))) score += 5;

      // Occasion matching
      if (selections.occasion === "anniversary" && (text.includes("luxury") || text.includes("premium") || text.includes("set"))) score += 3;
      if (selections.occasion === "wedding" && (text.includes("jewelry") || text.includes("gold") || text.includes("formal"))) score += 3;
      if (selections.occasion === "birthday" && (text.includes("gift") || text.includes("box") || product.featured)) score += 3;

      return { product, score };
    });

    return listWithScore
      .sort((a, b) => b.score - a.score) // Sort by relevance score
      .map(item => item.product)
      .slice(0, 8);
  }, [products, selections, showResults]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const ActiveIcon = STEPS[currentStep].icon;

  return (
    <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden font-sans">
      <SiteHeader />
      
      {/* Celestial Glow Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(188,155,95,0.05),transparent_70%)]" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand/10 blur-[120px] animate-float opacity-30" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold/10 blur-[120px] animate-float-alt opacity-20" />
        
        {/* Particle Stars */}
        <div className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 40px 70px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #fff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 90px 40px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0))',
            backgroundSize: '200px 200px'
          }} 
        />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20 relative z-10">
        <AnimatePresence mode="wait">
          {!isAdmin && (
            <motion.div
              key="upcoming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <div className="h-24 w-24 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-8 shadow-[0_0_30px_rgba(188,155,95,0.2)]">
                <Construction className="h-10 w-10 animate-pulse" />
              </div>
              <h2 className="text-4xl md:text-5xl font-serif mb-6 tracking-tight">Coming Soon</h2>
              <p className="text-gray-400 max-w-md text-lg font-light leading-relaxed mb-10">
                Our bespoke Gift Discovery Concierge is currently being refined. We're hand-selecting the finest experiences just for you.
              </p>
              <Button 
                onClick={() => navigate({ to: "/shop" })}
                className="rounded-full h-12 px-10 bg-gold text-black font-bold uppercase tracking-widest hover:scale-105 transition-transform"
              >
                Explore Shop
              </Button>
            </motion.div>
          )}

          {isAdmin && !showResults ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-16">
                <Reveal>
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-gold mb-8 shadow-[0_0_20px_rgba(188,155,95,0.15)] backdrop-blur-md">
                    <div className="h-1 w-1 rounded-full bg-gold animate-pulse" />
                    Celestial Selection
                  </div>
                </Reveal>
                <Reveal delay={0.1}>
                  <h1 className="font-serif text-6xl md:text-8xl mb-8 tracking-tighter leading-none">
                    Luminous <span className="text-shimmer italic block md:inline">Gifts</span>
                  </h1>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className="text-gray-400 max-w-2xl mx-auto text-xl font-light leading-relaxed tracking-wide">
                    Journey through our celestial vault to discover a gift that radiates timeless elegance and prestige.
                  </p>
                </Reveal>
              </div>

              <div className="w-full max-w-4xl rounded-[3rem] border border-gold/20 bg-black/60 backdrop-blur-[40px] p-10 md:p-20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group/container border-t-gold/40 border-l-gold/30">
                {/* Luminous Glow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-gold/5 via-transparent to-brand/5 pointer-events-none" />
                
                {/* Progress Bar - Celestial Flow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-gold/50 via-gold to-gold/50 shadow-[0_0_25px_rgba(188,155,95,0.6)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                  />
                </div>

                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gold/10 text-gold shadow-[inset_0_0_20px_rgba(188,155,95,0.2)] border border-gold/20 relative overflow-hidden group-hover/container:border-gold/40 transition-colors duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/container:opacity-100 transition-opacity" />
                      <ActiveIcon className="h-7 w-7 relative z-10" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gold/80">
                        Phase {currentStep + 1}
                      </span>
                      <span className="text-sm font-light text-gray-500 tracking-wide">
                        {Math.round(progress)}% Unlocked
                      </span>
                    </div>
                  </div>
                  {currentStep > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleBack} 
                      className="rounded-full gap-2 hover:bg-white/5 text-gray-500 hover:text-white border border-transparent hover:border-white/10 px-6 h-10 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStepData.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h2 className="text-4xl md:text-5xl font-serif mb-12 leading-tight tracking-tight text-white">
                      {currentStepData.question}
                    </h2>
                    
                    <div className="grid gap-6 sm:grid-cols-2">
                      {currentStepData.options.map((opt, idx) => (
                        <motion.button
                          key={opt.value}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => handleSelect(currentStepData.id, opt.value)}
                          className={cn(
                            "group relative flex flex-col items-start p-10 rounded-[2rem] border text-left transition-all duration-700",
                            selections[currentStepData.id] === opt.value
                              ? "border-gold bg-gold/10 shadow-[0_0_50px_rgba(188,155,95,0.15)] ring-1 ring-gold/30"
                              : "border-white/10 bg-white/5 hover:border-gold/50 hover:bg-white/[0.08] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <div className="flex w-full items-center justify-between mb-4">
                            <span className="font-bold text-2xl tracking-tight group-hover:text-gold transition-colors">{opt.label}</span>
                            <div className={cn(
                              "h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-700",
                              selections[currentStepData.id] === opt.value
                                ? "bg-gold border-gold shadow-[0_0_15px_rgba(188,155,95,0.6)]"
                                : "border-white/20 group-hover:border-gold/50"
                            )}>
                              {selections[currentStepData.id] === opt.value && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  <Check className="h-4 w-4 text-black stroke-[3px]" />
                                </motion.div>
                              )}
                            </div>
                          </div>
                          {opt.description && (
                            <p className="text-base text-gray-400 leading-relaxed font-light tracking-wide max-w-[90%]">
                              {opt.description}
                            </p>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-16"
            >
              <div className="text-center max-w-3xl mx-auto">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                   className="inline-flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gold/10 text-gold mb-10 shadow-[0_0_40px_rgba(188,155,95,0.2)] border border-gold/20 relative"
                >
                  <Sparkles className="h-12 w-12 animate-pulse" />
                  <div className="absolute inset-0 rounded-[2rem] animate-pulse-gold opacity-20" />
                </motion.div>
                <h1 className="font-serif text-6xl md:text-8xl mb-8 tracking-tighter leading-none text-white">
                  Celestial <span className="text-shimmer italic">Matches</span>
                </h1>
                <p className="text-gray-400 text-xl font-light mb-12 max-w-2xl mx-auto tracking-wide">
                  The stars have aligned. Our curator has selected these exceptional pieces that mirror your distinctive vision.
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  <Button onClick={reset} variant="ghost" className="rounded-full h-14 gap-3 px-12 border border-white/10 hover:bg-white/5 text-white">
                    <RefreshCw className="h-5 w-5" />
                    Reset Concierge
                  </Button>
                  <Button onClick={() => navigate({ to: "/shop" })} className="rounded-full h-14 gap-3 px-12 bg-gold text-black raised-surface font-bold text-lg">
                    Explore Vault
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {filteredProducts.length > 0 ? (
                <div className="space-y-10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-8">
                    <h2 className="text-4xl font-serif text-white tracking-tight">Vault Selection</h2>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold bg-gold/10 px-6 py-3 rounded-full border border-gold/20">
                      {filteredProducts.length} Radiant Pieces
                    </span>
                  </div>
                  <StaggerGrid className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                    {filteredProducts.map((p) => (
                      <StaggerItem key={p.id}>
                        <div className="hover:scale-[1.02] transition-transform duration-500">
                          <ProductCard product={p} />
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerGrid>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-32 rounded-[4rem] border border-dashed border-gold/20 bg-white/5 backdrop-blur-md shadow-2xl"
                >
                  <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-500">
                    <Gift className="h-10 w-10" />
                  </div>
                  <p className="text-3xl font-serif mb-4 text-white">The vault remains silent</p>
                  <p className="text-gray-400 mb-12 font-light tracking-wide max-w-md mx-auto">Our cosmic alignment didn't find an exact match. Let us broaden the search parameters.</p>
                  <Button onClick={reset} variant="outline" className="rounded-full px-12 h-12 border-gold/30 text-gold hover:bg-gold/10">Adjust Parameters</Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SiteFooter />
      <FloatingWhatsapp />
    </div>
  );
}
