'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, MapPin, Building, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function CustomerManagementClient({ initialCustomers, initialSites }: { initialCustomers: any[], initialSites: any[] }) {
    const [customers] = useState(initialCustomers);
    const [sites] = useState(initialSites);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
    
    // Group sites by customer
    const sitesByCustomer = (customerId: string) => sites.filter(s => s.customerId === customerId);
    
    // Unassigned sites
    const standaloneSites = sites.filter(s => !s.customerId);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tight">Customer & Site Memory</h1>
                    <p className="text-muted-foreground mt-1">Manage B2B customers, sites, and repeat business.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Site
                    </Button>
                    <Button className="bg-primary text-primary-foreground">
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {/* Left Column: Customer Directory */}
                <Card className="md:col-span-1 h-[700px] flex flex-col">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg">Directory</CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search customers..."
                                className="pl-8"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1">
                        <div className="divide-y">
                            {filteredCustomers.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => setSelectedCustomer(c.id)}
                                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedCustomer === c.id ? 'bg-muted/50 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                                >
                                    <p className="font-semibold">{c.name}</p>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <Phone className="h-3 w-3 mr-1" />
                                        {c.phone}
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <Building className="h-3 w-3 mr-1" />
                                        {sitesByCustomer(c.id).length} Sites
                                    </div>
                                </div>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No customers found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Customer Details & Sites */}
                <div className="md:col-span-2 space-y-6">
                    {!selectedCustomer ? (
                        <Card className="h-full flex items-center justify-center bg-muted/10 border-dashed">
                            <div className="text-center p-8 text-muted-foreground">
                                <Building className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Select a customer to view their Service Sites & History</p>
                            </div>
                        </Card>
                    ) : (
                        <>
                            {(() => {
                                const customer = customers.find(c => c.id === selectedCustomer);
                                const customerSites = sitesByCustomer(customer.id);
                                return (
                                    <>
                                        <Card>
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h2 className="text-2xl font-bold">{customer.name}</h2>
                                                        <p className="text-muted-foreground flex items-center mt-1">
                                                            <Phone className="h-4 w-4 mr-2" /> {customer.phone}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Lifetime Revenue</p>
                                                        <p className="font-semibold text-lg">?{customer.totalRevenue?.toLocaleString() || 0}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="flex justify-between items-end">
                                            <h3 className="text-lg font-semibold">Service Sites ({customerSites.length})</h3>
                                            <Button variant="outline" size="sm">Add Site to {customer.name}</Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {customerSites.map(site => (
                                                <Card key={site.id}>
                                                    <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                        <div>
                                                            <h4 className="font-semibold text-lg">{site.name}</h4>
                                                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                                                                <MapPin className="h-4 w-4 mr-1" /> {site.fullAddress}
                                                            </p>
                                                            <div className="flex gap-4 mt-3 text-sm">
                                                                <div className="flex items-center text-muted-foreground">
                                                                    <Calendar className="h-4 w-4 mr-1" /> 
                                                                    Last: {site.history?.lastServiceDate ? new Date(site.history.lastServiceDate._seconds * 1000).toLocaleDateString() : 'Never'}
                                                                </div>
                                                                <div className="flex items-center font-medium">
                                                                    Due: {site.history?.nextDueDate ? new Date(site.history.nextDueDate._seconds * 1000).toLocaleDateString() : 'Unscheduled'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 w-full md:w-auto">
                                                            <Button asChild className="w-full">
                                                                <Link href={`/dashboard/dealer-post-job?mode=repeat&siteId=${site.id}`}>
                                                                    Schedule Job
                                                                </Link>
                                                            </Button>
                                                            <Button variant="outline" className="w-full">
                                                                View History
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {customerSites.length === 0 && (
                                                <div className="p-8 text-center bg-muted/20 rounded-lg text-muted-foreground">
                                                    No service sites logged for this customer.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
