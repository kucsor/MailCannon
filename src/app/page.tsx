"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Languages, Loader2, Mail, Paperclip, Send, Trash2, Users } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { translateMessage } from "@/ai/flows/translate-message";
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
});

type FormData = z.infer<typeof formSchema>;

const MailCannonPage: FC = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: "",
      subject: "",
      message: "",
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validExtensions = ['.txt', '.md', '.pdf', '.doc', '.docx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (validExtensions.includes(fileExtension)) {
        setAttachment(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      } else {
         toast({
            variant: "destructive",
            title: "Invalid file type",
            description: "Please upload a .txt, .md, .pdf, .doc, or .docx file.",
        });
      }
    }
  };

  const handleTranslate = async () => {
    const currentMessage = form.getValues("message");
    if (!currentMessage) {
        toast({
            variant: "destructive",
            title: "Empty Message",
            description: "Please write a message to translate.",
        });
        return;
    }

    setIsTranslating(true);
    try {
        const result = await translateMessage({ message: currentMessage });
        form.setValue("message", result.translatedMessage, { shouldValidate: true });
        toast({
            title: "Message Translated!",
            description: "Your message has been translated to German.",
        });
    } catch (error) {
        console.error("Translation error:", error);
        toast({
            variant: "destructive",
            title: "Translation Error",
            description: "Failed to translate the message. Please try again.",
        });
    } finally {
        setIsTranslating(false);
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
                                <FormDescription>Enter emails separated by commas, semicolons, or new lines.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
               
                <Separator />
                
                <div
                    className={`space-y-2 p-4 border-2 rounded-lg transition-colors ${isDragging ? 'border-primary bg-primary/5 border-dashed' : 'border-dashed border-muted/50 hover:border-muted'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
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
                        {!attachment && <span className="text-sm text-muted-foreground hidden sm:inline-block">or drag and drop here</span>}
                    </div>
                     { !attachment && <FormDescription>Upload your CV (e.g., .pdf, .docx, .txt).</FormDescription> }
                </div>

                <Separator />
                
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
                            <FormLabel>Message Body</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Write your cover letter or message here..." {...field} rows={12} />
                            </FormControl>
                            <div className="flex justify-end mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTranslate}
                                    disabled={isTranslating || !field.value}
                                >
                                    {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                                    Translate to German
                                </Button>
                            </div>
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
