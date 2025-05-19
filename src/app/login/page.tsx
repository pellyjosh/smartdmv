
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PawPrint, LogIn, Eye, EyeOff } from "lucide-react"; // Eye icons for password visibility if implemented
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
      // Redirection is handled by the useAuth hook or useEffect below
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (user && !authIsLoading) {
    if (typeof window !== "undefined") {
      // Redirection logic is in useAuth, but this is a fallback
      // It might be better to show a loading spinner here until redirection completes
      // For simplicity, we'll allow useAuth to handle it primarily.
    }
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <header className="w-full p-4 flex justify-start items-center border-b border-border bg-card shadow-sm">
        <div className="flex items-center">
          <PawPrint className="h-8 w-8 text-primary mr-2" />
          <span className="font-bold text-xl text-foreground">VetConnectPro</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl flex flex-col md:flex-row rounded-xl shadow-2xl bg-card overflow-hidden min-h-[600px]">
          {/* Left column - Login Form */}
          <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Welcome back</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</FormLabel>
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
                       <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</FormLabel>
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
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                        <FormLabel className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer">
                          Remember me
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs sm:text-sm font-normal text-primary hover:underline"
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
                      <LogIn className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : "Sign in"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Right column - Image and Branding */}
          <div className="hidden md:flex md:w-3/5 relative bg-slate-200 dark:bg-slate-800 rounded-r-xl">
            <Image
              src="https://placehold.co/800x1000.png"
              alt="Illustration of a veterinary clinic scene with pets and vets"
              layout="fill"
              objectFit="cover"
              className="rounded-r-xl opacity-50"
              data-ai-hint="veterinary clinic illustration"
              priority
            />
            <div className="absolute inset-0 flex items-end p-8">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-lg shadow-md text-gray-800 dark:text-gray-200">
                <h2 className="text-2xl font-semibold mb-3 text-primary">
                  Comprehensive Pet Wellness
                </h2>
                <p className="text-sm leading-relaxed">
                  VetConnectPro simplifies managing your pet's health with easy appointment booking, centralized records, and helpful AI insights for a proactive approach to their care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
