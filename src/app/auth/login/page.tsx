"use client";

import { GalleryVerticalEnd, AlertCircle, Loader2, LogIn as LogInIcon, Eye, EyeOff } from "lucide-react"
import { useUser } from "@/context/UserContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

// Custom background types
type BackgroundImage = {
  id: string;
  path: string;
  name: string;
}

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginForm() {
  const userContext = useUser();
  const { login, isLoading: authIsLoading } = userContext;
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const loggedInUser = await login(data.email, data.password);
      if (loggedInUser) {
        toast({
          title: "Login Successful",
          description: "Redirecting to your dashboard...",
          variant: "default",
        });
        console.log('[LoginPage] Login successful for user:', loggedInUser.email);
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

  return (
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
  );
}

export default function LoginPage() {
  // Redirect if already logged in
  const userContext = useUser();
  const { user, isLoading: authIsLoading, initialAuthChecked } = userContext;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for the selected image
  const [selectedImage, setSelectedImage] = useState<string>("/assets/img/bg/login-bg-1.png")
  const [showImageSelector, setShowImageSelector] = useState<boolean>(false)
  const [loginImages, setLoginImages] = useState<BackgroundImage[]>([
    { 
      id: "custom-background-1", 
      path: "/assets/img/bg/login-bg-1.png", 
      name: "Custom Background 1"
    },
     { 
      id: "custom-background-2", 
      path: "/assets/img/bg/login-bg-2.png", 
      name: "Custom Background 2"
    }
  ])

  // Check for session expired error
  const errorParam = searchParams.get('error');
  const isSessionExpired = errorParam === 'session_expired';
  
  // Try to get saved preference from localStorage if no default is set
  useEffect(() => {
    const savedImage = localStorage.getItem("login-image-preference")
    if (savedImage && loginImages.length > 0) {
      const imageObj = loginImages.find(img => img.id === savedImage)
      if (imageObj) {
        setSelectedImage(imageObj.path)
      }
    }
  }, [loginImages])
  
  // Save preference to localStorage when changed
  const handleImageSelect = (imagePath: string, imageId: string) => {
    setSelectedImage(imagePath)
    localStorage.setItem("login-image-preference", imageId)
    setShowImageSelector(false)
  }

  console.log('[LoginPage Render] Context State: authIsLoading:', authIsLoading, 'initialAuthChecked:', initialAuthChecked, 'user:', user ? user.email : null);

  if (!initialAuthChecked || (authIsLoading && !user) ) {
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
  
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ backgroundColor: "#009EED" }}>
              <GalleryVerticalEnd className="size-4" />
            </div>
            <span className="text-xl font-semibold" style={{ color: "#009EED" }}>SmartDVM</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="mt-2 text-muted-foreground">Sign in to access your veterinary practice</p>
            </div>
            
            {isSessionExpired && (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Your session has expired. Please sign in again to continue.
                </AlertDescription>
              </Alert>
            )}
            
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-b z-10"></div>
        <img
          src={selectedImage}
          alt="Veterinary clinic illustration"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            console.error("Background image failed to load:", selectedImage);
            e.currentTarget.src = '/assets/img/bg/login-bg-1.png';
          }}
        />
        
        {/* Image Selector UI - Only visible when toggled */}
        {showImageSelector && (
          <div className="absolute top-6 right-6 z-20 rounded-lg bg-white/95 p-4 shadow-lg dark:bg-gray-900/90">
            <h3 className="mb-3 text-lg font-medium">Change Background</h3>
            <div className="grid grid-cols-1 gap-3">
              {loginImages.map((image) => (
                <div 
                  key={image.id}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-primary/10 ${
                    selectedImage === image.path ? 'bg-primary/20' : ''
                  }`}
                  onClick={() => handleImageSelect(image.path, image.id)}
                >
                  <div className="relative w-12 h-12 overflow-hidden rounded border">
                    <img 
                      src={image.path} 
                      alt={image.name}
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                  </div>
                  <span className="text-sm font-medium">{image.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Toggle button for image selector */}
        <button 
          onClick={() => setShowImageSelector(!showImageSelector)}
          className="absolute top-6 right-6 z-20 p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
          aria-label="Change background image"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"></path>
            <path d="M12 9v6"></path>
            <path d="M9 12h6"></path>
          </svg>
        </button>
        
        <div className="absolute bottom-6 left-6 right-6 z-20 rounded-lg bg-white/95 p-6 shadow-lg dark:bg-gray-900/90">
          <h2 className="mb-2 text-xl font-medium">Complete Veterinary Management</h2>
          <p className="text-muted-foreground">
            SmartDVM provides a comprehensive solution for modern veterinary practices with 
            appointment scheduling, medical records, lab integration, and AI-powered 
            diagnostic assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
