
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  initiateAadharVerification,
  confirmAadharVerification,
} from "@/ai/flows/aadhar-verification";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AadharVerificationDialogProps {
  onSuccess: (aadharNumber: string) => void;
  isVerified: boolean;
}

export function AadharVerificationDialog({ onSuccess, isVerified }: AadharVerificationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"enterAadhar" | "enterOtp">("enterAadhar");
  const [aadharNumber, setAadharNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setStep("enterAadhar");
    setAadharNumber("");
    setOtp("");
    setTransactionId("");
    setIsLoading(false);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const handleInitiate = async () => {
    if (!/^\d{12}$/.test(aadharNumber)) {
      setError("Please enter a valid 12-digit Aadhar number.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const result = await initiateAadharVerification({ aadharNumber });
      if (result.success) {
        setTransactionId(result.transactionId);
        setStep("enterOtp");
        toast({
          title: "OTP Sent!",
          description: result.message,
        });
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const result = await confirmAadharVerification({ transactionId, otp });
      if (result.isVerified) {
        onSuccess(aadharNumber);
        setIsOpen(false);
        toast({
          title: "Verification Successful!",
          description: result.message,
          variant: "success",
        });
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" disabled={isVerified}>
          Verify Aadhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck />
            Aadhar Verification
          </DialogTitle>
          <DialogDescription>
            {step === "enterAadhar"
              ? "Enter your Aadhar number to receive an OTP."
              : "Enter the 6-digit OTP sent to your registered mobile number."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "enterAadhar" ? (
            <div className="space-y-2">
              <Label htmlFor="aadhar">Aadhar Number</Label>
              <Input
                id="aadhar"
                value={aadharNumber}
                onChange={(e) => setAadharNumber(e.target.value)}
                placeholder="XXXX XXXX XXXX"
                maxLength={12}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password (OTP)</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">For this demo, the OTP is always <strong>123456</strong>.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={resetState}>
              Cancel
            </Button>
          </DialogClose>
          {step === "enterAadhar" ? (
            <Button onClick={handleInitiate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
