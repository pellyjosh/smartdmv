
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PawPrint, LogIn as LogInIcon, Eye, EyeOff } from "lucide-react"; // Renamed LogIn to LogInIcon
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";

// Login form schema
const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { user, login, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.email, data.password);
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
        variant: "default",
      });
      // Redirection is handled by the useAuth hook or useEffect
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  // User already logged in, redirection handled by useAuth typically
  if (user && !authIsLoading) {
    // This return null relies on useAuth to redirect.
    // A loading spinner could be shown here while useAuth processes the redirect.
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col bg-background"> {/* Overall page container */}
      {/* Header */}
      <header className="w-full p-4 flex justify-start items-center border-b border-border bg-card shadow-sm">
        <div className="flex items-center">
          <PawPrint className="h-8 w-8 text-primary mr-2" />
          <span className="font-bold text-xl text-foreground">VetConnectPro</span>
        </div>
      </header>

      {/* Main content with two columns */}
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left Column: Form */}
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
                            className="text-base md:text-sm pr-10" // Space for the icon
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
                  disabled={authIsLoading}
                >
                  {authIsLoading ? (
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

        {/* Right Column: Image and Branding */}
        <div className="hidden md:flex md:w-3/5 relative">
          <Image
            src="https://placehold.co/800x1200.png" 
            alt="Illustration of a veterinary clinic scene with pets and vets"
            layout="fill"
            objectFit="cover"
            className="opacity-90" // Slight opacity to match image if needed, or remove
            data-ai-hint="veterinary clinic illustration"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12"> {/* More padding on larger screens */}
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

