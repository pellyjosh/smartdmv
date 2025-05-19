"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  PawPrint, // Changed from HeartPulse
  LogIn, 
  Mail, 
  Lock,
  User
} from "lucide-react";
import { useRouter } from "next/navigation"; // Changed from wouter
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth"; // New mock auth hook
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Login form schema
const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { user, login, isLoading: authIsLoading } = useAuth(); // Use new auth hook
  const { toast } = useToast();
  const router = useRouter();

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
      // Redirection is handled by the useAuth hook
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Redirect to home if user is already logged in
  // This check should ideally happen in a wrapper or higher-order component
  // For now, if useAuth().user exists, it will redirect from within useAuth.
  // If the page renders before redirection, this is a fallback.
  if (user && !authIsLoading) {
    // The useAuth hook already handles redirection on login.
    // If a user lands here already logged in, redirect them from here too.
    // This might cause a flash if not handled carefully.
    // For a robust solution, middleware or a loading state in useAuth is better.
    if (typeof window !== "undefined") {
      router.push("/"); 
    }
    return null; // Render nothing while redirecting
  }


  return (
    <div 
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
    >
      <header className="w-full p-4 flex justify-between items-center border-b border-border bg-card shadow-sm">
        <div className="flex items-center">
          <PawPrint className="h-8 w-8 text-primary mr-2" />
          <span className="font-bold text-xl text-foreground">VetConnectPro</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl flex rounded-xl overflow-hidden shadow-2xl bg-card">
          {/* Left column - Branding and information */}
          <div 
            className="hidden lg:block lg:w-1/2 p-10 text-primary-foreground"
            style={{
              backgroundColor: "hsl(var(--primary))", // Use theme primary color
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          >
            <div className="mb-8">
              <div className="flex items-center">
                <PawPrint className="h-10 w-10 mr-2" /> {/* Changed icon */}
                <h2 className="text-3xl font-bold">VetConnectPro</h2> {/* Changed name */}
              </div>
              <p className="opacity-90 mt-2 text-lg">Your trusted partner in pet health.</p> {/* Updated tagline */}
            </div>

            <div className="mt-12 space-y-12">
              <div>
                <h3 className="text-xl font-semibold mb-3">Easy Vet Service Access</h3>
                <p className="opacity-80">Quickly find and connect with veterinary services in your area. Manage appointments and records with ease.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Secure and Reliable</h3>
                <p className="opacity-80">Your data is protected with industry-standard security measures. Access your information anytime, anywhere.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">AI Symptom Checker</h3>
                <p className="opacity-80">Utilize our AI-powered tool for preliminary symptom assessment to help guide your pet care decisions.</p>
              </div>
            </div>
          </div>

          {/* Right column - Authentication form */}
          <div className="w-full lg:w-1/2 p-6 sm:p-10">
            <div className="mb-6 block lg:hidden">
              <div className="mb-6 flex items-center">
                <PawPrint className="h-8 w-8 text-primary mr-2" />
                <h1 className="text-2xl font-bold text-foreground">VetConnectPro</h1>
              </div>
            </div>
            
            {/* Login Form Only */}
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
                <p className="text-muted-foreground mt-1">Sign in to your VetConnectPro account</p>
              </div>
            
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input 
                              className="pl-10" 
                              placeholder="you@example.com" 
                              {...field} 
                            />
                          </div>
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
                        <div className="flex justify-between items-center">
                          <FormLabel>Password</FormLabel>
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-xs font-normal text-primary"
                            type="button"
                            onClick={() => toast({ title: "Forgot Password", description: "This feature is not yet implemented."})}
                          >
                            Forgot password?
                          </Button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input 
                              className="pl-10" 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
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
                    type="submit" 
                    className="w-full py-6" /* Use default button styling which respects theme */
                    disabled={authIsLoading}
                  >
                    {authIsLoading ? (
                      <>
                        <LogIn className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : "Sign in to account"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-card text-muted-foreground">Demo Accounts</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="text-sm" 
                    onClick={() => {
                      loginForm.setValue("email", "admin@vetconnect.pro"); // Updated demo email
                      loginForm.setValue("password", "password");
                    }}
                  >
                    <User className="mr-2 h-4 w-4" /> Admin Demo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-sm" 
                    onClick={() => {
                      loginForm.setValue("email", "vet@vetconnect.pro"); // Updated demo email
                      loginForm.setValue("password", "password");
                    }}
                  >
                     <User className="mr-2 h-4 w-4" /> Vet Demo
                  </Button>
                </div>
                 <Button 
                    variant="outline" 
                    className="text-sm w-full mt-3" 
                    onClick={() => {
                      loginForm.setValue("email", "client@vetconnect.pro"); // Client demo email
                      loginForm.setValue("password", "password");
                    }}
                  >
                     <User className="mr-2 h-4 w-4" /> Client Demo
                  </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} VetConnectPro. All rights reserved.</p>
      </footer>
    </div>
  );
}
