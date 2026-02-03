"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Mail, Paperclip, Send, Sparkles, Trash2, Users } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { generateCoverLetter } from "@/ai/flows/generate-cover-letter";
import { improveDraftMessage } from "@/ai/flows/improve-draft-message";
import { sendEmail } from "@/app/actions/send-email";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  recipients: z.string().min(1, { message: "Please enter at least one recipient email." }),
  subject: z.string().min(1, { message: "Subject cannot be empty." }),
  message: z.string().min(1, { message: "Message body cannot be empty." }),
  jobDescription: z.string().optional(),
  tone: z.string().default("Formal"),
});

type FormData = z.infer<typeof formSchema>;

const MailCannonPage: FC = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [cvContent, setCvContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: "",
      subject: "",
      message: "",
      jobDescription: "",
      tone: "Formal",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachment(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCvContent(text);
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error reading file",
          description: "Could not read the file content. Please try a text-based file (.txt, .md) or a different PDF/DOCX.",
        });
        setCvContent(null);
      }
      reader.readAsText(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setCvContent(null);
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

  const handleGenerateCoverLetter = async () => {
    const jobDescription = form.getValues("jobDescription");
    const tone = form.getValues("tone");
    if (!cvContent) {
      toast({
        variant: "destructive",
        title: "CV not attached",
        description: "Please attach your CV to generate a cover letter.",
      });
      return;
    }
    if (!jobDescription) {
      form.setError("jobDescription", { message: "Please provide the job description."})
      toast({
        variant: "destructive",
        title: "Job description is empty",
        description: "Please provide the job description.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateCoverLetter({
        cv: cvContent,
        jobDescription,
        tone,
      });
      form.setValue("message", result.coverLetter, { shouldValidate: true });
      form.setValue("subject", `Application for the position described`, { shouldValidate: true });
      toast({
        title: "Cover Letter Generated!",
        description: "A tailored cover letter has been created for you.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to generate cover letter. Please try again.",
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
            html: data.message.replace(/\n/g, '<br>'),
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
                                        <Textarea placeholder="email1@corp.com, email2@corp.com..." {...field} className="pl-10"/>
                                    </FormControl>
                                </div>
                                <FormDescription>Enter emails separated by commas, semicolons, or new lines.</FormDescription>
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
                     { !attachment && <FormDescription>Upload your CV (e.g., .pdf, .docx, .txt)</FormDescription> }
                </div>

                <Separator />
                
                <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent"/>
                        <h3 className="text-lg font-semibold">AI Assistant</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Use AI to generate a tailored cover letter from a job description, or improve your existing draft.
                    </p>
                    <FormField
                        control={form.control}
                        name="jobDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Job Description for Cover Letter</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Paste the job description here to generate a cover letter..." {...field} rows={5} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-wrap items-end gap-4">
                        <FormField
                            control={form.control}
                            name="tone"
                            render={({ field }) => (
                                <FormItem className="flex-1 min-w-[150px]">
                                    <FormLabel>Tone of Voice</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a tone" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Formal">Formal</SelectItem>
                                            <SelectItem value="Friendly">Friendly</SelectItem>
                                            <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                         <Button type="button" onClick={handleGenerateCoverLetter} disabled={isGenerating || !cvContent} className="bg-accent hover:bg-accent/90">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Generate Letter
                        </Button>
                    </div>
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
