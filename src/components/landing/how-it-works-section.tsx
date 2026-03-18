'use client';

interface HowItWorksSectionProps {
    t: (key: string) => string;
}

export function HowItWorksSection({ t }: HowItWorksSectionProps) {
    return (
        <section id="how-it-works" className="py-32 md:py-48 bg-secondary/10 relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">{t('workflowTitle')}</h2>
                    <p className="text-muted-foreground/80 text-xl md:text-2xl max-w-3xl mx-auto">
                        {t('workflowDesc')}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative lg:gap-16">
                    {/* Connection line for desktop */}
                    <div className="hidden md:block absolute top-[3.5rem] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10" />
                    
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="text-center group p-10 rounded-[3rem] transition-all duration-500">
                            <div className="w-28 h-28 rounded-[2rem] bg-background border border-border/50 flex items-center justify-center mx-auto mb-10 group-hover:border-primary group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-500 text-foreground group-hover:text-primary">
                                <span className="text-5xl font-black">{step}</span>
                            </div>
                            <h3 className="text-3xl font-bold mb-5 tracking-tight">{t(`step${step}Title`)}</h3>
                            <p className="text-muted-foreground/80 text-xl leading-relaxed">{t(`step${step}Desc`)}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
        </section>
    );
}
