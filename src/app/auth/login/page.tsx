
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import NextImage from "next/image"; // Renamed to avoid conflict with local Image variable
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { HeartPulse, PawPrint, LogIn as LogInIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { Checkbox } from "@/components/ui/checkbox";
import { generateLoginImage } from '@/ai/flows/generate-login-image-flow';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const userContext = useUser();
  const { user, login, isLoading: authIsLoading, initialAuthChecked } = userContext;

  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginImage, setLoginImage] = useState<string>("https://placehold.co/800x1200.png");
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      setImageLoading(true);
      setImageError(null);
      try {
        const result = await generateLoginImage({ topic: "veterinary clinic environment" });
        if (result.imageDataUri) {
          setLoginImage(result.imageDataUri);
        } else {
          throw new Error("No image data URI returned");
        }
      } catch (err) {
        console.error("Failed to generate login image:", err);
        setImageError("Could not load background image.");
        // Fallback to placeholder is already the default state of loginImage
      } finally {
        setImageLoading(false);
      }
    };
    // fetchImage(); // Uncomment to enable AI image generation
    setImageLoading(false); // Keeping placeholder for now to avoid API calls during testing
  }, []);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      console.log('[LoginPage] onLoginSubmit called with:', data.email);
      const loggedInUser = await login(data.email, data.password); // login from UserContext
      if (loggedInUser) {
        toast({
          title: "Login Successful",
          description: "Redirecting to your dashboard...",
          variant: "default",
        });
        console.log('[LoginPage] Login successful for user:', loggedInUser.email);
        // Navigation is handled by UserProvider's useEffect based on user state change
      } else {
         toast({
            title: "Login Failed",
            description: "Login attempt returned no user, but no specific error was thrown.",
            variant: "destructive",
        });
        console.warn('[LoginPage] Login call returned no user, but no error thrown.');
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials or server error.",
        variant: "destructive",
      });
      console.error('[LoginPage] Login submission error:', error);
    } finally {
        setIsSubmitting(false);
    }
  };

  console.log('[LoginPage Render] Context State: authIsLoading:', authIsLoading, 'initialAuthChecked:', initialAuthChecked, 'user:', user ? user.email : null);

  if (!initialAuthChecked || (authIsLoading && !user) ) { // Show loading if still checking or if loading and no user yet
    console.log('[LoginPage Render] Initial auth not checked or auth is loading. Rendering loading message.');
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading authentication status...</p>
      </div>
    );
  }

  if (user && initialAuthChecked && !authIsLoading) {
    console.log('[LoginPage Render] User is authenticated, initial check done, not loading. Rendering redirect message.');
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  console.log('[LoginPage Render] Rendering login form.');
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="w-full p-4 flex justify-start items-center border-b border-border bg-card shadow-sm">
        <div className="flex items-center">
          <HeartPulse className="h-8 w-8 text-primary mr-2" />
          <span className="font-bold text-xl text-foreground">Smart<span className="text-primary">DVM</span></span>
        </div>
      </header>
      <main className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-2/5 bg-card p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-10 text-left">
              <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to access your veterinary practice
              </p>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          {...field}
                          className="text-base md:text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                            className="text-base md:text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                          Remember me
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm font-normal text-primary hover:underline"
                    type="button"
                    onClick={() => toast({ title: "Forgot Password", description: "Password recovery is not yet implemented."})}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting || authIsLoading}
                >
                  {(isSubmitting || authIsLoading) ? (
                    <>
                      <LogInIcon className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : "Sign in"}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <div className="hidden md:flex md:w-3/5 relative">
          {imageLoading && (
            <div className="absolute inset-0 flex justify-center items-center bg-slate-200">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          {!imageLoading && imageError && (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-200 p-4 text-center">
              <p className="text-destructive mb-2">{imageError}</p>
              <p className="text-sm text-muted-foreground">Displaying default image.</p>
            </div>
          )}
          <NextImage
            src={loginImage}
            alt="Illustration of a veterinary clinic scene with pets and vets"
            layout="fill"
            objectFit="cover"
            className="opacity-90"
            data-ai-hint="veterinary clinic illustration"
            priority
            unoptimized={loginImage.startsWith('data:image')}
          />
          <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-lg shadow-md text-gray-800 dark:text-gray-200">
              <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-primary">
                Complete Veterinary Management
              </h2>
              <p className="text-xs lg:text-sm leading-relaxed">
                VetConnectPro provides a comprehensive solution for modern veterinary practices with appointment scheduling, medical records, lab integration, and AI-powered diagnostic assistance.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
