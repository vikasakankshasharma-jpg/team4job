import React, { useState } from "react";
import { PortfolioItem } from "@/lib/types";
import { BeforeAfterSlider } from "./before-after-slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageIcon, SplitSquareHorizontal, ExternalLink } from "lucide-react";

export function PortfolioViewer({ portfolio }: { portfolio: PortfolioItem[] }) {
  if (!portfolio || portfolio.length === 0) return null;

  return (
    <div className="space-y-8 mt-12">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl"><ImageIcon className="h-6 w-6 text-primary" /></div>
        <h4 className="text-xl font-black italic uppercase tracking-tighter text-muted-foreground/80">Completed Work Portfolio</h4>
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {portfolio.map((item) => (
          <Dialog key={item.id}>
            <DialogTrigger asChild>
              <div className="group relative rounded-3xl overflow-hidden bg-background/50 border border-white/5 shadow-xl cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                <div className="aspect-[4/3] w-full bg-muted">
                  {item.type === 'before_after' ? (
                    <div className="relative w-full h-full pointer-events-none">
                      <img src={item.afterImageUrl!} className="absolute inset-0 w-full h-full object-cover blur-[2px]" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold tracking-widest text-sm backdrop-blur-sm">
                        <SplitSquareHorizontal className="mr-2 h-5 w-5" /> VIEW TRANSFORMATION
                      </div>
                    </div>
                  ) : (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </div>
                <div className="p-6">
                  <Badge variant="secondary" className="mb-3">{item.category}</Badge>
                  <h4 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 bg-black/90 border-white/10 overflow-hidden">
               <div className="aspect-[16/9] w-full bg-black flex items-center justify-center relative">
                 {item.type === 'before_after' ? (
                   <BeforeAfterSlider beforeImage={item.beforeImageUrl!} afterImage={item.afterImageUrl!} className="w-full h-full rounded-none" />
                 ) : (
                   <img src={item.imageUrl} alt={item.title} className="max-w-full max-h-full object-contain" />
                 )}
               </div>
               <div className="p-8 bg-surface-container border-t border-white/10">
                 <Badge variant="secondary" className="mb-3">{item.category}</Badge>
                 <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">{item.title}</h3>
                 <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
               </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
