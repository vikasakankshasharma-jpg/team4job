"use client";

import React, { useState } from "react";
import { User, PortfolioItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, SplitSquareHorizontal, Image as ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { addPortfolioItemAction, deletePortfolioItemAction } from "@/app/actions/user.actions";
import { BeforeAfterSlider } from "./before-after-slider";
import { Badge } from "@/components/ui/badge";

export function PortfolioSection({ user, onUpdate }: { user: User, onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<'single' | 'before_after'>('single');
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(user.professionalProfile?.skills?.[0] || "General");
  
  const [singleFile, setSingleFile] = useState<File[]>([]);
  const [beforeFile, setBeforeFile] = useState<File[]>([]);
  const [afterFile, setAfterFile] = useState<File[]>([]);
  
  const { storage } = useFirebase();
  const { toast } = useToast();

  const portfolio = user.professionalProfile?.portfolio || [];

  const handleUpload = async () => {
    if (!title || !description) {
      toast({ title: "Validation Error", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    if (mode === 'single' && singleFile.length === 0) {
      toast({ title: "Validation Error", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (mode === 'before_after' && (beforeFile.length === 0 || afterFile.length === 0)) {
      toast({ title: "Validation Error", description: "Please upload BOTH Before and After images.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      let payload: any = { type: mode, title, description, category };

      if (mode === 'single') {
        const fileRef = ref(storage, `portfolios/${user.id}/${Date.now()}_single`);
        await uploadBytes(fileRef, singleFile[0]);
        payload.imageUrl = await getDownloadURL(fileRef);
      } else {
        const beforeRef = ref(storage, `portfolios/${user.id}/${Date.now()}_before`);
        const afterRef = ref(storage, `portfolios/${user.id}/${Date.now()}_after`);
        await uploadBytes(beforeRef, beforeFile[0]);
        await uploadBytes(afterRef, afterFile[0]);
        payload.beforeImageUrl = await getDownloadURL(beforeRef);
        payload.afterImageUrl = await getDownloadURL(afterRef);
      }

      const res = await addPortfolioItemAction(user.id, payload);
      if (res.success) {
        toast({ title: "Success", description: "Portfolio item added!" });
        setIsOpen(false);
        resetForm();
        onUpdate();
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this portfolio item?")) return;
    const res = await deletePortfolioItemAction(user.id, id);
    if (res.success) {
      toast({ title: "Deleted" });
      onUpdate();
    }
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setSingleFile([]); setBeforeFile([]); setAfterFile([]);
  };

  return (
    <Card className="border-none shadow-2xl bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden">
      <CardHeader className="p-12 bg-background/5 border-b border-white/5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">Work Portfolio</CardTitle>
          <CardDescription>Showcase your best completed jobs to win more bids.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-2xl font-bold tracking-widest"><PlusCircle className="w-5 h-5 mr-2" /> Add Project</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-surface-container border-white/10 rounded-3xl p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">New Portfolio Item</DialogTitle>
              <DialogDescription>Add a single photo or a Before/After transformation.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="flex gap-4 p-1 bg-background/50 rounded-2xl border border-white/5">
                <Button variant={mode === 'single' ? "default" : "ghost"} className="flex-1 rounded-xl" onClick={() => setMode('single')}>
                  <ImageIcon className="w-4 h-4 mr-2" /> Single Photo
                </Button>
                <Button variant={mode === 'before_after' ? "default" : "ghost"} className="flex-1 rounded-xl" onClick={() => setMode('before_after')}>
                  <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Before & After Slider
                </Button>
              </div>

              <div className="grid gap-4">
                <Input placeholder="Project Title (e.g. Clean AC Installation)" value={title} onChange={e => setTitle(e.target.value)} className="h-12 rounded-2xl bg-background/50" />
                <Textarea placeholder="Describe the work you did..." value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px] rounded-2xl bg-background/50" />
              </div>

              {mode === 'single' ? (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Upload Final Result</label>
                  <FileUpload onFilesChange={setSingleFile} maxFiles={1} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Before</label>
                    <FileUpload onFilesChange={setBeforeFile} maxFiles={1} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">After</label>
                    <FileUpload onFilesChange={setAfterFile} maxFiles={1} />
                  </div>
                </div>
              )}

              <Button onClick={handleUpload} disabled={isUploading} className="w-full h-12 rounded-2xl text-lg font-black tracking-widest uppercase">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                Save to Portfolio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="p-12">
        {portfolio.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <ImageIcon className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-bold">No projects yet</h3>
            <p className="text-sm">Upload your first project to stand out to clients.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {portfolio.map((item: PortfolioItem) => (
              <div key={item.id} className="group relative rounded-3xl overflow-hidden bg-background/50 border border-white/5 shadow-xl">
                <div className="aspect-[4/3] w-full bg-muted">
                  {item.type === 'before_after' ? (
                    <BeforeAfterSlider beforeImage={item.beforeImageUrl!} afterImage={item.afterImageUrl!} className="w-full h-full rounded-none" />
                  ) : (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <Badge variant="secondary" className="mb-3">{item.category}</Badge>
                  <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
