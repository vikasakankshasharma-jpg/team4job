"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import NextImage from "next/image";
import { Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSignupContext, SignUpFormValues } from "./signup-context";

export function StepPhoto() {
  const { setValue, watch } = useFormContext<SignUpFormValues>();
  const { setCurrentStep, photo, setPhoto } = useSignupContext();
  
  const tAuth = useTranslations('auth');
  const { toast } = useToast();
  const role = watch("role");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: tAuth('cameraAccessDenied'),
        description: tAuth('cameraAccessDeniedDesc') || "Please allow camera access.",
      });
    }
  }, [toast, tAuth]);

  useEffect(() => {
    if (!photo) {
      startCamera();
    }
    
    // Cleanup function strictly capturing the current state
    return () => {
      // Intentionally using a ref value snapshot or safely accessing it
      const currentVideo = videoRef.current;
      if (currentVideo && currentVideo.srcObject) {
        const stream = currentVideo.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera, photo]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');
        setPhoto(dataUrl);
        setValue('realAvatarUrl', dataUrl);
      }
      
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4 mb-14">
        <h3 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">
          {tAuth('stepPhoto') || "BIOMETRIC CAPTURE"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
          {tAuth('profilePhotoDesc') || "Project your visual authority to the network"}
        </p>
      </div>

      <div className="relative mx-auto w-80 h-80 group mb-14">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative w-full h-full bg-surface-container-low/40 rounded-full overflow-hidden border-none ring-1 ring-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.2)] flex items-center justify-center backdrop-blur-3xl">
          {photo ? (
            <NextImage 
              src={photo} 
              alt={tAuth('profilePreview')} 
              fill 
              className="object-cover animate-in zoom-in-125 duration-700" 
              unoptimized 
            />
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover grayscale-[0.5] hover:grayscale-0 transition-all duration-700 scale-105" autoPlay muted playsInline />
              {!hasCameraPermission && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/80 backdrop-blur-xl p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mb-6" />
                  <h4 className="font-black text-[10px] uppercase tracking-[0.3em] mb-2">{tAuth('cameraAccessRequired')}</h4>
                  <p className="text-[10px] font-medium opacity-60 leading-relaxed uppercase tracking-widest">{tAuth('cameraAccessRequiredDesc')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        {photo ? (
          <Button variant="outline" onClick={() => { setPhoto(null); startCamera(); }} className="h-16 px-10 rounded-[1.25rem] border-white/10 font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-background/5 transition-colors">
            {tAuth('retakePhoto') || "RECALIBRATE SENSOR"}
          </Button>
        ) : (
          <Button onClick={handleCapture} disabled={!hasCameraPermission} className="h-16 px-10 rounded-[1.25rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            <Camera className="mr-3 h-5 w-5" />
            {tAuth('capturePhoto') || "CAPTURE BIOMETRIC"}
          </Button>
        )}
      </div>

      <div className="pt-12 flex gap-6">
        <Button variant="outline" onClick={() => setCurrentStep(role === 'Client' ? 'contact' : 'verification')} className="h-16 flex-1 rounded-[1.5rem] border-white/10 font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-background/5 transition-colors">
          {tAuth('back')}
        </Button>
        <Button onClick={() => setCurrentStep(role === 'Professional' ? 'skills' : 'details')} className="h-16 flex-[2] rounded-[1.5rem] bg-primary text-foreground font-black text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all" disabled={!photo}>
          {tAuth('next') || "CONFIRM IDENTITY"}
        </Button>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </motion.div>
  );
}
