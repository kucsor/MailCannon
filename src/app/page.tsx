"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Mail, Paperclip, Send, Sparkles, Trash2, Users } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { generatePersonalizedApplication } from "@/ai/flows/generate-cover-letter";
import { improveDraftMessage } from "@/ai/flows/improve-draft-message";
import { sendEmail } from "@/app/actions/send-email";
import { escapeHtml } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  recipients: z.string().min(1, { message: "Please enter at least one recipient email." }),
  subject: z.string().min(1, { message: "Subject cannot be empty." }),
  message: z.string().min(1, { message: "Message body cannot be empty." }),
  jobDescription: z.string().optional(),
  personalNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const MailCannonPage: FC = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: "",
      subject: "",
      message: "",
      jobDescription: "",
      personalNotes: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImproveDraft = async () => {
    const message = form.getValues("message");
    if (!message) {
      toast({
        variant: "destructive",
        title: "Message is empty",
        description: "Please write a message first to improve it.",
      });
      return;
    }
    setIsImproving(true);
    try {
      const result = await improveDraftMessage({ draftMessage: message });
      form.setValue("message", result.improvedMessage, { shouldValidate: true });
      toast({
        title: "Draft Improved!",
        description: "Your message has been enhanced by AI.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to improve the draft. Please try again.",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            resolve(text);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
  }

  const handleGenerateApplication = async () => {
    const recipients = form.getValues("recipients");
    const firstRecipient = recipients.split(/[\n,;]+/)[0]?.trim();

    if (!firstRecipient) {
        toast({
            variant: "destructive",
            title: "No Recipient",
            description: "Please enter at least one recipient email to generate a personalized application.",
        });
        return;
    }
    
    if (!attachment) {
      toast({
        variant: "destructive",
        title: "CV not attached",
        description: "Please attach your CV to generate an application.",
      });
      return;
    }
    
    const { jobDescription, personalNotes } = form.getValues();

    setIsGenerating(true);
    let cvText: string;
    try {
      cvText = await readFileAsText(attachment);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error reading file",
        description: "Could not read the file content. Please try a text-based file (.txt, .md) or a different PDF/DOCX.",
      });
      setIsGenerating(false);
      return;
    }

    try {
      const result = await generatePersonalizedApplication({
        recipientEmail: firstRecipient,
        cv: cvText,
        jobDescription,
        personalNotes,
      });
      form.setValue("subject", result.subject, { shouldValidate: true });
      form.setValue("message", result.message, { shouldValidate: true });
      toast({
        title: "Application Generated!",
        description: `A personalized application for ${firstRecipient} has been created.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to generate the application. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove 'data:*/*;base64,' prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
  }

  const onSubmit = async (data: FormData) => {
    if (!attachment) {
      toast({
        variant: "destructive",
        title: "No CV attached",
        description: "Please attach your CV before sending.",
      });
      return;
    }
    setIsSending(true);

    try {
        const attachmentContent = await fileToBase64(attachment);
        
        const recipients = data.recipients.split(/[\n,;]+/).map(e => e.trim()).filter(e => e);
        if (recipients.length === 0) {
             toast({
                variant: "destructive",
                title: "No recipients",
                description: "Please enter at least one recipient email.",
            });
            setIsSending(false);
            return;
        }

        const result = await sendEmail({
            to: recipients,
            subject: data.subject,
            html: escapeHtml(data.message).replace(/\n/g, '<br>'),
            attachment: {
                content: attachmentContent,
                filename: attachment.name,
                type: attachment.type,
            }
        });

        if (result.success) {
            toast({
                title: "Emails Sent!",
                description: result.message,
            });
        } else {
             toast({
                variant: "destructive",
                title: "Failed to send emails",
                description: (typeof result.error === 'string' ? result.error : 'An unexpected error occurred. Check the server logs for details.'),
            });
        }

    } catch (error) {
        console.error("Sending email failed:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "An error occurred while sending the email. You may need to configure your Gmail credentials in a .env.local file.",
        });
    } finally {
        setIsSending(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex items-center gap-3 mb-2">
            <Mail className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            MailCannon
            </h1>
        </div>
        <p className="max-w-xl text-muted-foreground">
          Streamline your job search. Write one application, attach your CV, and send it to your entire list of potential employers in one click.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-4xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle>Compose Your Application</CardTitle>
              <CardDescription>Fill in the details below to send your application to multiple recipients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2 rounded-lg bg-secondary/50 p-4">
                        <FormLabel>Sender</FormLabel>
                        <p className="text-sm text-muted-foreground">
                            Emails will be sent from the Google Account configured in your <code>.env.local</code> file.
                        </p>
                    </div>
                     <FormField
                        control={form.control}
                        name="recipients"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Recipient Emails</FormLabel>
                                 <div className="relative">
                                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <FormControl>
                                        <Textarea placeholder="email1@company.com, email2@corp.com..." {...field} className="pl-10"/>
                                    </FormControl>
                                </div>
                                <FormDescription>Enter emails separated by commas, semicolons, or new lines. The first email will be used for AI personalization.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
               
                <Separator />
                
                <div className="space-y-2">
                    <FormLabel>CV / Resume Attachment</FormLabel>
                    <div className="flex items-center gap-4 flex-wrap">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="mr-2 h-4 w-4" />
                            {attachment ? "Change File" : "Upload File"}
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.pdf,.doc,.docx" />
                        {attachment && (
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-normal py-1 px-3">
                                    {attachment.name}
                                </Badge>
                                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={removeAttachment}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Remove attachment</span>
                                </Button>
                            </div>
                        )}
                    </div>
                     { !attachment && <FormDescription>Upload your CV (e.g., .pdf, .docx, .txt). This is required for AI generation.</FormDescription> }
                </div>

                <Separator />
                
                <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-accent"/>
                            <h3 className="text-lg font-semibold">AI Assistant</h3>
                        </div>
                         <Button type="button" onClick={handleGenerateApplication} disabled={isGenerating || !attachment} className="bg-accent hover:bg-accent/90">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Generate Application
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Use AI to generate a personalized email by analyzing the first recipient's email, your CV, and the details below.
                    </p>
                    <FormField
                        control={form.control}
                        name="jobDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Job Description (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Paste the job description here for a more tailored application..." {...field} rows={4} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="personalNotes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Personal Notes for AI (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., I have a daughter and would prefer night shifts. I am aware school holidays can be a challenge and I am proactive about planning." {...field} rows={3} />
                                </FormControl>
                                <FormDescription>Add any personal details for the AI to include. Use with caution.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Job Application: [Your Name] for [Position]" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                 <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <FormLabel>Message Body</FormLabel>
                                <Button type="button" variant="ghost" size="sm" onClick={handleImproveDraft} disabled={isImproving || !field.value}>
                                    {isImproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-accent" />}
                                    Improve with AI
                                </Button>
                            </div>
                            <FormControl>
                                <Textarea placeholder="Write your cover letter or message here..." {...field} rows={12} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter>
                <Button type="submit" size="lg" className="w-full" disabled={isSending}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send to All Recipients
                </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </main>
  );
};

export default MailCannonPage;
