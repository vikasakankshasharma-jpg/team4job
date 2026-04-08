'use client';

interface HowItWorksSectionProps {
    t: (key: string) => string;
}

export function HowItWorksSection({ t }: HowItWorksSectionProps) {
    return (
        <section id="how-it-works" className="py-24 md:py-32 bg-background relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-24">
                    <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-6 leading-none">{t('workflowTitle') || "OPERATIONAL PIPELINE"}</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic max-w-2xl mx-auto leading-relaxed">
                        {t('workflowDesc') || "Standardized protocols for mission deployment and execution"}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    {/* Connection line for desktop */}
                    <div className="hidden md:block absolute top-[4rem] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent -z-10" />
                    
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="text-center group p-14 rounded-[3.5rem] transition-all duration-700 hover:bg-surface-container-low/40 hover:ring-1 hover:ring-white/10 backdrop-blur-3xl">
                            <div className="w-32 h-32 rounded-[3.5rem] bg-surface-container-low ring-1 ring-white/10 flex items-center justify-center mx-auto mb-10 group-hover:ring-primary/40 group-hover:scale-110 group-hover:shadow-[0_45px_120px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 text-primary">
                                <span className="text-6xl font-black italic tracking-tighter">{step}</span>
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tigh uppercase mb-4">{t(`step${step}Title`)}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic leading-relaxed">{t(`step${step}Desc`)}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
        </section>
    );
}
