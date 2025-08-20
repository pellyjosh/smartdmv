'use client';
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignaturePad, SignaturePadRef } from "@/components/ui/signature-pad";
import { 
  useSignaturesByUser,
  CreateSignatureParams 
} from "@/hooks/use-electronic-signatures";
import { useUser } from "@/context/UserContext";
import { usePractice } from "@/hooks/use-practice";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useUser();
  const { practice } = usePractice();
  const { toast } = useToast();
  
  // Debug log for practice data
  useEffect(() => {
    console.log("Practice data in profile page:", practice);
  }, [practice]);
  const signaturePadRef = useRef<SignaturePadRef>(null);
  
  // State for profile information
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");
  const [zipCode, setZipCode] = useState(user?.zipCode || "");
  const [country, setCountry] = useState(user?.country || "");
  
  // State for signature settings
  const [signerName, setSignerName] = useState(user?.name || "");
  const [signerTitle, setSignerTitle] = useState(user?.role?.replace(/_/g, ' ') || "");
  type SignerType = 'PRACTITIONER' | 'CLIENT' | 'WITNESS' | 'OTHER';
  const [signerType, setSignerType] = useState<SignerType>('PRACTITIONER');
  
  // Get user's signatures from API
  const userIdStr = user?.id ? String(user.id) : undefined;
  const { data: signatures = [], refetch, isLoading: signaturesLoading } = useQuery<any[]>({
    queryKey: ["/api/signatures", userIdStr],
    enabled: !!userIdStr,
    queryFn: async () => {
      const res = await fetch(`/api/signatures?userId=${encodeURIComponent(userIdStr!)}` , { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  });
  
  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
  if (!user?.id) throw new Error('Missing user');
  const response = await apiRequest("PATCH", `/api/users/${user.id}`, profileData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        ...data
      }));
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Password change function
  const changePassword = () => {
    toast({
      title: "Password reset initiated",
      description: "Check your email for instructions to reset your password.",
    });
  };
  
  // Signature creation mutation
  const createSignatureMutation = useMutation({
    mutationFn: async (signatureData: CreateSignatureParams) => {
      const response = await apiRequest("POST", "/api/signatures", signatureData);
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      if (signaturePadRef.current) {
        signaturePadRef.current.clear();
      }
      
      toast({
        title: "Signature saved",
        description: "Your electronic signature has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save signature",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete signature mutation
  const deleteSignatureMutation = useMutation({
    mutationFn: async (signatureId: number) => {
      await apiRequest("DELETE", `/api/signatures/${signatureId}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Signature deleted",
        description: "Your electronic signature has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete signature",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    });
  };
  
  // Electronic signature handling functions
  const handleSaveSignature = () => {
    if (!signaturePadRef.current) return;
    
    const signatureData = signaturePadRef.current.getSignatureData();
    if (!signatureData) {
      toast({
        title: "Signature Required",
        description: "Please provide a signature before saving",
        variant: "destructive"
      });
      return;
    }
    
    // Save the signature
    const getPracticeIdFromUser = (): number => {
      if (!user) return 0;
      switch (user.role) {
        case 'ADMINISTRATOR':
        case 'SUPER_ADMIN':
          return user.currentPracticeId ? parseInt(String(user.currentPracticeId), 10) : 0;
        case 'CLIENT':
        case 'PRACTICE_ADMINISTRATOR':
        case 'VETERINARIAN':
        case 'PRACTICE_MANAGER':
          return user.practiceId ? parseInt(String(user.practiceId), 10) : 0;
        default:
          return practice?.id || 0;
      }
    };
    const practiceIdNum = getPracticeIdFromUser();
    const userIdNum = user?.id ? parseInt(String(user.id), 10) : 0;
    const newSignature: CreateSignatureParams = {
      userId: userIdNum,
      signerName,
      signerEmail: user?.email || '',
      signerType: signerType,
      signatureData,
      documentType: 'USER_PROFILE',
      documentId: userIdNum,
      practiceId: practiceIdNum,
      documentName: 'Profile Signature',
      metadata: { signerTitle }
    };
    
    createSignatureMutation.mutate(newSignature);
  };
  
  // Handle signature deletion
  const handleDeleteSignature = (id: number) => {
    if (window.confirm("Are you sure you want to delete this signature?")) {
      deleteSignatureMutation.mutate(id, {
        onSuccess: () => {
          refetch();
        }
      });
    }
  };
  
  // Ensure practice staff users have access to org-related features
  const isPracticeStaff = !!user && (
    user.role === 'PRACTICE_ADMINISTRATOR' ||
    user.role === 'PRACTICE_MANAGER' ||
    user.role === 'VETERINARIAN' ||
    user.role === 'ADMINISTRATOR' ||
    user.role === 'SUPER_ADMIN'
  );
  const isPracticeAdmin = !!user && user.role === 'PRACTICE_ADMINISTRATOR';
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and settings
        </p>
      </div>
      
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="mb-6">
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {isPracticeStaff && <TabsTrigger value="practice">Practice</TabsTrigger>}
          {isPracticeAdmin && <TabsTrigger value="organization">Organization</TabsTrigger>}
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input 
                      id="state" 
                      value={state} 
                      onChange={(e) => setState(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip/Postal Code</Label>
                    <Input 
                      id="zipCode" 
                      value={zipCode} 
                      onChange={(e) => setZipCode(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={user?.username} 
                    disabled 
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Your username cannot be changed
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input 
                    id="role" 
                    value={user?.role?.replace(/_/g, ' ')} 
                    disabled 
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password or set up two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" placeholder="••••••••" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="••••••••" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" />
                </div>
              </div>
              
              <Button onClick={changePassword}>Change Password</Button>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Additional security settings for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                  <p className="text-sm text-slate-500">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch id="two-factor" />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Sign out from all devices</h3>
                  <p className="text-sm text-slate-500">
                    This will sign you out from all other browsers and devices
                  </p>
                </div>
                <Button variant="outline">Sign Out All</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isPracticeStaff && (
          <TabsContent value="practice">
            <Card>
              <CardHeader>
                <CardTitle>Practice Information</CardTitle>
                <CardDescription>
                  Your current practice details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {practice ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Practice Name</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          {practice.name}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          {practice.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          {practice.phone}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          {practice.address}
                          {practice.city && `, ${practice.city}`}
                          {practice.state && `, ${practice.state}`}
                          {practice.zipCode && ` ${practice.zipCode}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Practice Status</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          {practice.status}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Is Head Office</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          {practice.isHeadOffice !== undefined ? (practice.isHeadOffice ? "Yes" : "No") : "-"}
                        </div>
                      </div>
                    </div>
                    
                    {isPracticeAdmin && (
                      <p className="text-sm text-slate-500">
                        To update practice information, please visit the Practice Admin page.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-muted-foreground">No practice information available</p>
                  </div>
                )}
              </CardContent>
              {isPracticeAdmin && (
                <CardFooter>
                  <Button variant="outline" onClick={() => window.location.href = "/practice-admin"}>
                    Go to Practice Admin
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        )}
        
        {isPracticeAdmin && (
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>
                  Your organization details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {practice?.organizationId ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center py-4">
                      <div className="text-center">
                        <h3 className="text-lg font-medium">Organization ID</h3>
                        <p className="text-2xl text-primary mt-2">{practice.organizationId}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      Your practice is part of this organization.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-muted-foreground">No organization information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle>Electronic Signatures</CardTitle>
              <CardDescription>
                Create and manage your electronic signatures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="signature-pad">Add New Signature</Label>
                <div className="border rounded-md p-4 bg-white">
                  <SignaturePad
                    ref={signaturePadRef}
                    width={400}
                    height={200}
                    className="w-full border border-gray-200 rounded"
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => signaturePadRef.current?.clear()}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveSignature}
                      disabled={createSignatureMutation.isPending}
                    >
                      {createSignatureMutation.isPending ? "Saving..." : "Save Signature"}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signer-name">Signer Name</Label>
                    <Input 
                      id="signer-name" 
                      value={signerName} 
                      onChange={(e) => setSignerName(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signer-title">Signer Title</Label>
                    <Input 
                      id="signer-title" 
                      value={signerTitle} 
                      onChange={(e) => setSignerTitle(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signer-type">Signature Type</Label>
                  <select 
                    id="signer-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={signerType}
                    onChange={(e) => setSignerType(e.target.value as SignerType)}
                  >
                    <option value="PRACTITIONER">Practitioner</option>
                    <option value="CLIENT">Client</option>
                    <option value="WITNESS">Witness</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Saved Signatures</h3>
                
                {signaturesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-muted-foreground">Loading signatures...</p>
                  </div>
        ) : (signatures as any[]).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(signatures as any[]).map((signature: any) => (
                      <Card key={signature.id} className="relative overflow-hidden">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteSignature(signature.id)}
                          >
                            <span className="sr-only">Delete</span>
                            ✕
                          </Button>
                        </div>
                        <CardContent className="pt-6">
                          <div className="bg-white p-2 border rounded-md">
                            <img 
                              src={signature.signatureData} 
                              alt="Signature" 
                              className="max-w-full h-auto"
                            />
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium">{signature.signerName}</p>
                            <p className="text-xs text-slate-500">
                {(signature.metadata?.signerTitle) || signerTitle} • {signature.signerType}
                            </p>
                            <p className="text-xs text-slate-400">
                              Created: {signature.createdAt ? format(new Date(signature.createdAt), 'MMM d, yyyy') : 'Unknown'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-10 border rounded-md bg-muted/10">
                    <p className="text-muted-foreground">No signatures found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}