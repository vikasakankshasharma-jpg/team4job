'use client';

interface HowItWorksSectionProps {
    t: (key: string) => string;
}

export function HowItWorksSection({ t }: HowItWorksSectionProps) {
    return (
        <section id="how-it-works" className="py-16 md:py-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">{t('workflowTitle')}</h2>
                    <p className="text-muted-foreground mt-2">
                        {t('workflowDesc')}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-primary">1</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t('step1Title')}</h3>
                        <p className="text-muted-foreground">{t('step1Desc')}</p>
                    </div>
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-primary">2</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t('step2Title')}</h3>
                        <p className="text-muted-foreground">{t('step2Desc')}</p>
                    </div>
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-primary">3</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t('step3Title')}</h3>
                        <p className="text-muted-foreground">{t('step3Desc')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
