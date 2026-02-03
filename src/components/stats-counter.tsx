"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCcw, Mail, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StatsCounterProps {
  stats: {
    cvsSent: number;
    emailsSent: number;
  };
  onReset: (code: string) => boolean;
}

export function StatsCounter({ stats, onReset }: StatsCounterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const handleReset = () => {
    const success = onReset(code);
    if (success) {
      toast({
        title: "Statistici resetate",
        description: "Contoarele au fost resetate cu succes.",
      });
      setIsOpen(false);
      setCode("");
    } else {
      toast({
        variant: "destructive",
        title: "Cod incorect",
        description: "Codul introdus nu este valid.",
      });
    }
  };

  return (
    <Card className="w-full shadow-md bg-card border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-muted-foreground">Statistici</CardTitle>
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors">
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Resetare Statistici</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Resetare Statistici</DialogTitle>
              <DialogDescription>
                Introduceți codul PIN pentru a reseta contoarele. Această acțiune este ireversibilă.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Cod
                </Label>
                <Input
                  id="code"
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="col-span-3"
                  placeholder="****"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleReset} variant="destructive">Resetare</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-lg">
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <span className="text-2xl font-bold text-foreground">{stats.cvsSent}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">CV-uri Trimise</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-lg">
            <Mail className="h-8 w-8 mb-2 text-accent" />
            <span className="text-2xl font-bold text-foreground">{stats.emailsSent}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Mail-uri Trimise</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
