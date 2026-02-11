"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useFirestore } from "@/lib/firebase/client-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Users, Target } from "lucide-react";
import {
    getSignupAnalytics,
    SignupFunnelData,
    OutreachEffectiveness,
} from "@/lib/signup-analytics";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useTranslations } from "next-intl";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SignupAnalyticsClient() {
    const { isAdmin } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const t = useTranslations('admin.signupAnalytics');

    const [loading, setLoading] = useState(true);
    const [funnelData, setFunnelData] = useState<SignupFunnelData | null>(null);
    const [outreachData, setOutreachData] = useState<OutreachEffectiveness | null>(null);
    const [roleDistribution, setRoleDistribution] = useState<{ Installer: number; 'Job Giver': number; unknown: number } | null>(null);

    useEffect(() => {
        if (!db || !isAdmin) return;

        async function fetchAnalytics() {
            setLoading(true);
            try {
                // Optimized: Single read operation (Costs 1x instead of 3x)
                const { funnel, outreach, roles } = await getSignupAnalytics(db);

                setFunnelData(funnel);
                setOutreachData(outreach);
                setRoleDistribution(roles);
            } catch (error) {
                console.error("Error fetching analytics:", error);
                toast({
                    title: t('error'),
                    description: t('loadingError'),
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [db, isAdmin, toast, t]);

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">{t('accessDenied')}</p>
            </div>
        );
    }

    if (loading || !funnelData || !outreachData || !roleDistribution) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Prepare funnel chart data
    const funnelChartData = [
        { name: t('funnel.stages.started'), value: funnelData.totalStarted, fill: COLORS[0] },
        { name: t('funnel.stages.step1'), value: funnelData.step1Complete, fill: COLORS[1] },
        { name: t('funnel.stages.step2'), value: funnelData.step2Complete, fill: COLORS[2] },
        { name: t('funnel.stages.step3'), value: funnelData.step3Complete, fill: COLORS[3] },
        { name: t('funnel.stages.converted'), value: funnelData.totalConverted, fill: COLORS[4] },
    ];

    // Prepare outreach comparison data
    const outreachChartData = [
        {
            name: t('outreach.labels.contacted'),
            [t('outreach.labels.conversionRate')]: outreachData.contacted.conversionRate,
            [t('outreach.labels.total')]: outreachData.contacted.total,
        },
        {
            name: t('outreach.labels.notContacted'),
            [t('outreach.labels.conversionRate')]: outreachData.nonContacted.conversionRate,
            [t('outreach.labels.total')]: outreachData.nonContacted.total,
        },
    ];

    const getbiggestDropOffLabel = () => {
        const stepKey = Object.entries(funnelData.dropRates).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        const stepNum = stepKey.replace('step', '');
        return `${t('cards.step')} ${stepNum}`;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cards.totalStarted')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{funnelData.totalStarted}</div>
                        <p className="text-xs text-muted-foreground mt-1">{t('cards.attempts')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cards.conversionRate')}</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{funnelData.conversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {funnelData.totalConverted} {t('cards.converted')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cards.biggestDropOff')}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {getbiggestDropOffLabel()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {Math.max(...Object.values(funnelData.dropRates)).toFixed(1)}% {t('cards.dropRate')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cards.outreachImpact')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {outreachData.improvement >= 0 ? '+' : ''}{outreachData.improvement.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {outreachData.improvement >= 0 ? t('cards.improvement') : t('cards.decrease')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Funnel Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('funnel.title')}</CardTitle>
                    <CardDescription>{t('funnel.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={funnelChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8">
                                {funnelChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Drop rates */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-sm font-medium">{t('funnel.stages.step1')}</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step1.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">{t('cards.dropRate')}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">{t('funnel.stages.step2')}</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step2.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">{t('cards.dropRate')}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">{t('funnel.stages.step3')}</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step3.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">{t('cards.dropRate')}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">{t('cards.step')} 4</p>
                            <p className="text-2xl font-bold text-destructive">{funnelData.dropRates.step4.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">{t('cards.dropRate')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Outreach Effectiveness */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('outreach.title')}</CardTitle>
                    <CardDescription>{t('outreach.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={outreachChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey={t('outreach.labels.conversionRate')} fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-2">{t('outreach.contacted')}</h4>
                            <p className="text-sm text-muted-foreground">{t('outreach.stats.total', { count: outreachData.contacted.total })}</p>
                            <p className="text-sm text-muted-foreground">{t('outreach.stats.converted', { count: outreachData.contacted.converted })}</p>
                            <p className="text-2xl font-bold mt-2">{outreachData.contacted.conversionRate.toFixed(1)}%</p>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h4 className="font-semibold mb-2">{t('outreach.nonContacted')}</h4>
                            <p className="text-sm text-muted-foreground">{t('outreach.stats.total', { count: outreachData.nonContacted.total })}</p>
                            <p className="text-sm text-muted-foreground">{t('outreach.stats.converted', { count: outreachData.nonContacted.converted })}</p>
                            <p className="text-2xl font-bold mt-2">{outreachData.nonContacted.conversionRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('roles.title')}</CardTitle>
                    <CardDescription>{t('roles.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center border rounded-lg p-4">
                            <p className="text-sm font-medium">{t('roles.installer')}</p>
                            <p className="text-3xl font-bold mt-2">{roleDistribution.Installer}</p>
                        </div>
                        <div className="text-center border rounded-lg p-4">
                            <p className="text-sm font-medium">{t('roles.jobGiver')}</p>
                            <p className="text-3xl font-bold mt-2">{roleDistribution['Job Giver']}</p>
                        </div>
                        <div className="text-center border rounded-lg p-4">
                            <p className="text-sm font-medium">{t('roles.unknown')}</p>
                            <p className="text-3xl font-bold mt-2">{roleDistribution.unknown}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
