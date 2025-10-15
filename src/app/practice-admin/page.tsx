// "use client";

// import { useState, useEffect } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Switch } from "@/components/ui/switch";
// import { Separator } from "@/components/ui/separator";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useAuth } from "@/hooks/use-auth";
// import { usePractice } from "@/hooks/use-practice";
// import { useToast } from "@/hooks/use-toast";
// import { apiRequest, queryClient } from "@/lib/queryClient";
// import { UserRoleEnum } from "@/lib/db-types";
// import { CurrencySelector } from "@/components/currencies/currency-selector";
// import { Lock, ShieldAlert } from "lucide-react";

// export default function PracticeAdminPage() {
//   const { user } = useAuth();
//   const { practice, isLoading: practiceLoading, updatePractice, uploadLogo, isUpdating, isUploading } = usePractice();
//   const { toast } = useToast();

//   // guard: only practice admins should access this page
//   useEffect(() => {
//     if (user && String((user as any).role) !== UserRoleEnum.PRACTICE_ADMIN) {
//       // simple client-side redirect
//       window.location.href = "/";
//     }
//   }, [user]);

//   // form state
//   const [practiceName, setPracticeName] = useState(practice?.name || "");
//   const [practiceEmail, setPracticeEmail] = useState(practice?.email || "");
//   const [practicePhone, setPracticePhone] = useState(practice?.phone || "");
//   const [practiceAddress, setPracticeAddress] = useState(practice?.address || "");
//   const [practiceCity, setPracticeCity] = useState(practice?.city || "");
//   const [practiceState, setPracticeState] = useState(practice?.state || "");
//   const [practiceZipCode, setPracticeZipCode] = useState(practice?.zipCode || "");
//   const [practiceCountry, setPracticeCountry] = useState(practice?.country || "");
//   const [isHeadOffice, setIsHeadOffice] = useState(practice?.isHeadOffice || false);
//   const [defaultCurrencyCode, setDefaultCurrencyCode] = useState((practice as any)?.defaultCurrencyCode || "USD");

//   // logo state
//   const [logoFile, setLogoFile] = useState<File | null>(null);
//   const [logoPreview, setLogoPreview] = useState<string>(practice?.logoPath ? `/uploads/${practice.logoPath}` : "");

//   useEffect(() => {
//     if (practice) {
//       setPracticeName(practice.name || "");
//       setPracticeEmail(practice.email || "");
//       setPracticePhone(practice.phone || "");
//       setPracticeAddress(practice.address || "");
//       setPracticeCity(practice.city || "");
//       setPracticeState(practice.state || "");
//       setPracticeZipCode(practice.zipCode || "");
//       setPracticeCountry(practice.country || "");
//       setIsHeadOffice(practice.isHeadOffice || false);
//       setDefaultCurrencyCode((practice as any).defaultCurrencyCode || "USD");
//       setLogoPreview(practice.logoPath ? `/uploads/${practice.logoPath}` : "");
//     }
//   }, [practice]);

//   // fetch locations for the user's organization
//   const orgId = (user as any)?.organizationId;
//   const { data: locations = [], isLoading: locationsLoading } = useQuery({
//     queryKey: ["/api/organizations", orgId, "practices"],
//     queryFn: async () => {
//       if (!orgId) return [];
//       const res = await apiRequest("GET", `/api/organizations/${orgId}/practices`);
//       return await res.json();
//     },
//     enabled: !!orgId
//   });

//   // fetch users for the current practice
//   const { data: practiceUsers = [], isLoading: usersLoading } = useQuery({
//     queryKey: ["/api/practices", practice?.id, "users"],
//     queryFn: async () => {
//       if (!practice?.id) return [];
//       const res = await apiRequest("GET", `/api/practices/${practice.id}/users`);
//       return await res.json();
//     },
//     enabled: !!practice?.id
//   });

//   // submit practice changes
//   const handlePracticeSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!practice) return;
//     try {
//       await updatePractice(practice.id, {
//         name: practiceName,
//         email: practiceEmail,
//         phone: practicePhone,
//         address: practiceAddress,

//         );
//       }
//                       <Input id="lockout-duration" type="number" min="15" max="1440" value={(practice as any)?.accountLockoutMinutes || 30} disabled />
//                       <p className="text-xs text-muted-foreground">Time an account remains locked after exceeding max login attempts</p>
//                     </div>
//                   </div>

//                   <div className="mt-4">
//                     <p className="text-sm text-amber-600 flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Security settings can only be configured by a system administrator</p>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
// "use client";

// import { useState, useEffect } from "react";
// import { useQuery, useMutation } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// "use client";

// import { useState, useEffect } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Switch } from "@/components/ui/switch";
// import { Separator } from "@/components/ui/separator";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useAuth } from "@/hooks/use-auth";
// import { usePractice } from "@/hooks/use-practice";
// import { useToast } from "@/hooks/use-toast";
// import { apiRequest, queryClient } from "@/lib/queryClient";
// import { UserRoleEnum } from "@/lib/db-types";
// import { CurrencySelector } from "@/components/currencies/currency-selector";
// import { Lock, ShieldAlert } from "lucide-react";

// export default function PracticeAdminPage() {
//   const { user } = useAuth();
//   const { practice, isLoading: practiceLoading, updatePractice, uploadLogo, isUpdating, isUploading } = usePractice();
//   const { toast } = useToast();

//   useEffect(() => {
//     if (user && String((user as any).role) !== UserRoleEnum.PRACTICE_ADMIN) {
//       window.location.href = "/";
//     }
//   }, [user]);

//   const [practiceName, setPracticeName] = useState(practice?.name || "");
//   const [practiceEmail, setPracticeEmail] = useState(practice?.email || "");
//   const [practicePhone, setPracticePhone] = useState(practice?.phone || "");
//   const [practiceAddress, setPracticeAddress] = useState(practice?.address || "");
//   const [practiceCity, setPracticeCity] = useState(practice?.city || "");
//   const [practiceState, setPracticeState] = useState(practice?.state || "");
//   const [practiceZipCode, setPracticeZipCode] = useState(practice?.zipCode || "");
//   const [practiceCountry, setPracticeCountry] = useState(practice?.country || "");
//   const [isHeadOffice, setIsHeadOffice] = useState(practice?.isHeadOffice || false);
//   const [defaultCurrencyCode, setDefaultCurrencyCode] = useState((practice as any)?.defaultCurrencyCode || "USD");

//   const [logoFile, setLogoFile] = useState<File | null>(null);
//   const [logoPreview, setLogoPreview] = useState<string>(practice?.logoPath ? `/uploads/${practice.logoPath}` : "");

//   useEffect(() => {
//     if (practice) {
//       setPracticeName(practice.name || "");
//       setPracticeEmail(practice.email || "");
//       setPracticePhone(practice.phone || "");
//       setPracticeAddress(practice.address || "");
//       setPracticeCity(practice.city || "");
//       setPracticeState(practice.state || "");
//       setPracticeZipCode(practice.zipCode || "");
//       setPracticeCountry(practice.country || "");
//       setIsHeadOffice(practice.isHeadOffice || false);
//       setDefaultCurrencyCode((practice as any).defaultCurrencyCode || "USD");
//       setLogoPreview(practice.logoPath ? `/uploads/${practice.logoPath}` : "");
//     }
//   }, [practice]);

//   const orgId = (user as any)?.organizationId;
//   const { data: locations = [], isLoading: locationsLoading } = useQuery({
//     queryKey: ["/api/organizations", orgId, "practices"],
//     queryFn: async () => {
//       if (!orgId) return [];
//       const res = await apiRequest("GET", `/api/organizations/${orgId}/practices`);
//       return await res.json();
//     },
//     enabled: !!orgId
//   });

//   const { data: practiceUsers = [], isLoading: usersLoading } = useQuery({
//     queryKey: ["/api/practices", practice?.id, "users"],
//     queryFn: async () => {
//       if (!practice?.id) return [];
//       const res = await apiRequest("GET", `/api/practices/${practice.id}/users`);
//       return await res.json();
//     },
//     enabled: !!practice?.id
//   });

//   const handlePracticeSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!practice) return;
//     try {
//       await updatePractice(practice.id, {
//         name: practiceName,
//         email: practiceEmail,
//         phone: practicePhone,
//         address: practiceAddress,
//         city: practiceCity,
//         state: practiceState,
//         zipCode: practiceZipCode,
//         country: practiceCountry,
//         isHeadOffice,
//         defaultCurrencyCode: (defaultCurrencyCode as any)
//       } as any);
//       toast({ title: "Practice updated", description: "Your changes have been saved." });
//     } catch (err: any) {
//       toast({ title: "Failed to save", description: err?.message || String(err), variant: "destructive" });
//     }
//   };

//   const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       const file = e.target.files[0];
//       setLogoFile(file);
//       setLogoPreview(URL.createObjectURL(file));
//     }
//   };

//   const handleLogoSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!logoFile || !practice) {
//       toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
//       return;
//     }
//     try {
//       await uploadLogo(practice.id, logoFile);
//       queryClient.invalidateQueries(["/api/practices", practice.id]);
//       toast({ title: "Logo uploaded", description: "Practice logo uploaded successfully." });
//     } catch (err: any) {
//       toast({ title: "Upload failed", description: err?.message || String(err), variant: "destructive" });
//     }
//   };

//   const handleDeleteLogo = async () => {
//     if (!practice) return;
//     if (!confirm("Are you sure you want to remove the practice logo?")) return;
//     try {
//       await apiRequest("DELETE", `/api/practices/${practice.id}/logo`);
//       queryClient.invalidateQueries(["/api/practices", practice.id]);
//       setLogoPreview("");
//       toast({ title: "Logo removed" });
//     } catch (err: any) {
//       toast({ title: "Failed to remove logo", description: err?.message || String(err), variant: "destructive" });
//     }
//   };

//   return (
//     <div className="container mx-auto py-6">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold tracking-tight">Practice Administration</h1>
//         <p className="text-muted-foreground">Manage settings for your veterinary practice</p>
//       </div>

//       <Tabs defaultValue="practice-settings" className="space-y-4">
//         <TabsList className="mb-6">
//           <TabsTrigger value="practice-settings">Practice Settings</TabsTrigger>
//           <TabsTrigger value="locations">Locations</TabsTrigger>
//           <TabsTrigger value="users">Users</TabsTrigger>
//           <TabsTrigger value="appearance">Appearance</TabsTrigger>
//           <TabsTrigger value="security">Security</TabsTrigger>
//         </TabsList>

//         <TabsContent value="practice-settings">
//           <Card>
//             <CardHeader>
//               <CardTitle>Practice Information</CardTitle>
//               <CardDescription>Update your practice details and contact information</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {practiceLoading ? (
//                 <div className="flex justify-center items-center py-10">
//                   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
//                 </div>
//               ) : (
//                 <form onSubmit={handlePracticeSubmit} className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="practice-name">Practice Name</Label>
//                       <Input id="practice-name" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} />
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="practice-email">Email Address</Label>
//                       <Input id="practice-email" type="email" value={practiceEmail} onChange={(e) => setPracticeEmail(e.target.value)} />
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="practice-phone">Phone Number</Label>
//                       <Input id="practice-phone" type="tel" value={practicePhone} onChange={(e) => setPracticePhone(e.target.value)} />
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="is-head-office">Head Office</Label>
//                       <div className="flex items-center space-x-2 h-10">
//                         <Switch id="is-head-office" checked={isHeadOffice} onCheckedChange={setIsHeadOffice} disabled />
//                         <label htmlFor="is-head-office" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//                           This is the head office location
//                           <span className="ml-1 text-xs text-muted-foreground">(managed by system administrator)</span>
//                         </label>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="practice-address">Street Address</Label>
//                     <Input id="practice-address" value={practiceAddress} onChange={(e) => setPracticeAddress(e.target.value)} />
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="practice-city">City</Label>
//                       <Input id="practice-city" value={practiceCity} onChange={(e) => setPracticeCity(e.target.value)} />
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="practice-state">State / Province</Label>
//                       <Input id="practice-state" value={practiceState} onChange={(e) => setPracticeState(e.target.value)} />
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="practice-zip">Postal / ZIP Code</Label>
//                       <Input id="practice-zip" value={practiceZipCode} onChange={(e) => setPracticeZipCode(e.target.value)} />
//                     </div>
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="practice-country">Country</Label>
//                     <Input id="practice-country" value={practiceCountry} onChange={(e) => setPracticeCountry(e.target.value)} />
//                   </div>

//                   <div className="space-y-2">
//                     <CurrencySelector label="Default Currency" description="Select the default currency for billing and financial operations" id="default-currency" value={defaultCurrencyCode} onChange={setDefaultCurrencyCode} />
//                   </div>

//                   <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
//                 </form>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="locations">
//           <Card>
//             <CardHeader>
//               <CardTitle>Practice Locations</CardTitle>
//               <CardDescription>Manage multiple locations for your organization</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {locationsLoading ? (
//                 <div className="flex items-center justify-center py-10">
//                   <p className="text-muted-foreground">Loading locations...</p>
//                 </div>
//               ) : locations.length > 0 ? (
//                 <div className="space-y-6">
//                   <div className="grid grid-cols-1 gap-4">
//                     {locations.map((location: any) => (
//                       <div key={location.id} className={`p-4 border rounded-lg ${location.id === practice?.id ? 'border-primary bg-primary/5' : ''}`}>
//                         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                           <div>
//                             <h3 className="font-medium text-lg flex items-center gap-2">
//                               {location.name}
//                               {location.isHeadOffice && (<span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">Head Office</span>)}
//                               {location.id === practice?.id && (<span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Current</span>)}
//                             </h3>
//                             <p className="text-sm text-muted-foreground mt-1">{location.address}, {location.city}, {location.state} {location.zipCode}</p>
//                             <div className="flex items-center gap-4 mt-2">
//                               <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {location.phone}</p>
//                               <p className="text-sm"><span className="text-muted-foreground">Email:</span> {location.email}</p>
//                             </div>
//                           </div>

//                           <div className="flex items-center gap-2">
//                             {location.id !== practice?.id && (
//                               <Button variant="outline" size="sm" onClick={() => {
//                                 apiRequest("PATCH", `/api/users/${(user as any).id}/practice`, { practiceId: location.id })
//                                   .then(() => window.location.reload())
//                                   .catch((error) => toast({ title: "Failed to switch practice", description: error.message, variant: "destructive" }));
//                               }}>Switch to this practice</Button>
//                             )}

//                             <Button variant="ghost" size="sm" onClick={() => {
//                               if (location.id === practice?.id) {
//                                 document.querySelector('[data-value="practice-settings"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
//                               } else {
//                                 window.location.href = `/practice-admin?practice=${location.id}`;
//                               }
//                             }}>{location.id === practice?.id ? "Edit" : "View"}</Button>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>

//                   <Separator />

//                   <div className="flex items-center justify-end">
//                     <Button onClick={() => window.location.href = "/users-and-permissions?tab=locations"}>Add New Location</Button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex flex-col items-center justify-center py-10 space-y-4">
//                   <p className="text-muted-foreground">No locations found for your organization</p>
//                   <Button onClick={() => window.location.href = "/users-and-permissions?tab=locations"}>Add New Location</Button>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="users">
//           <Card>
//             <CardHeader>
//               <CardTitle>Practice Users</CardTitle>
//               <CardDescription>Manage users associated with this practice</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {usersLoading ? (
//                 <div className="flex items-center justify-center py-10"><p className="text-muted-foreground">Loading users...</p></div>
//               ) : practiceUsers.length > 0 ? (
//                 <div className="space-y-6">
//                   <div className="overflow-x-auto">
//                     <table className="w-full">
//                       <thead>
//                         <tr>
//                           <th className="text-left p-2 bg-muted/50">Name</th>
//                           <th className="text-left p-2 bg-muted/50">Email</th>
//                           <th className="text-left p-2 bg-muted/50">Role</th>
//                           <th className="text-left p-2 bg-muted/50">Status</th>
//                           <th className="text-right p-2 bg-muted/50">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y">
//                         {practiceUsers.map((usr: any) => (
//                           <tr key={usr.id}>
//                             <td className="p-2">{usr.name || usr.username}</td>
//                             <td className="p-2">{usr.email}</td>
//                             <td className="p-2">{String(usr.role).replace(/_/g, ' ')}</td>
//                             <td className="p-2">
//                               <span className={`inline-block px-2 py-1 text-xs rounded ${usr.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{usr.isActive ? 'Active' : 'Inactive'}</span>
//                             </td>
//                             <td className="p-2 text-right">
//                               <Button variant="ghost" size="sm" onClick={() => window.location.href = `/users-and-permissions?tab=users&edit=${usr.id}`}>Edit</Button>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   <Separator />

//                   <div className="flex items-center justify-end">
//                     <Button onClick={() => window.location.href = "/users-and-permissions?tab=users&add=true"}>Add New User</Button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex flex-col items-center justify-center py-10 space-y-4">
//                   <p className="text-muted-foreground">No users found for this practice</p>
//                   <Button onClick={() => window.location.href = "/users-and-permissions?tab=users&add=true"}>Add New User</Button>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="appearance">
//           <Card>
//             <CardHeader>
//               <CardTitle>Practice Branding</CardTitle>
//               <CardDescription>Customize your practice's appearance and branding</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={handleLogoSubmit} className="space-y-6">
//                 <div className="space-y-4">
//                   <div>
//                     <Label htmlFor="practice-logo">Practice Logo</Label>
//                     <p className="text-sm text-muted-foreground mt-1 mb-4">Upload your practice logo to display on reports, invoices, and client portal</p>

//                     <div className="flex flex-col md:flex-row md:items-end gap-6">
//                       <div className="w-40 h-40 border rounded-lg flex items-center justify-center overflow-hidden bg-muted/30">
//                         {logoPreview ? (
//                           <div className="relative w-full h-full">
//                             <img src={logoPreview} alt="Practice logo preview" className="w-full h-full object-contain" />
//                             <button type="button" className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-muted" onClick={handleDeleteLogo}>✕</button>
//                           </div>
//                         ) : (
//                           <div className="text-muted-foreground text-center p-4"><p>No logo uploaded</p></div>
//                         )}
//                       </div>

//                       <div className="flex-1 space-y-4">
//                         <Input id="practice-logo" type="file" accept="image/*" onChange={handleLogoChange} />
//                         <div className="flex gap-2">
//                           <Button type="submit" disabled={!logoFile || isUploading}>{isUploading ? "Uploading..." : "Upload Logo"}</Button>
//                           {logoPreview && (<Button type="button" variant="outline" onClick={handleDeleteLogo}>Remove Logo</Button>)}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </form>

//               <Separator className="my-8" />

//               <div className="space-y-4">
//                 <h3 className="text-lg font-medium">Theme Customization</h3>
//                 <p className="text-sm text-muted-foreground">Customize the color scheme and appearance of your practice interface</p>

//                 <Button onClick={() => window.location.href = "/theme-customization"}>Customize Theme</Button>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="security">
//           <Card>
//             <CardHeader>
//               <CardTitle>Security Settings</CardTitle>
//               <CardDescription>Manage security settings and user access for your practice</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-6">
//                 <div>
//                   <h3 className="text-lg font-medium mb-2">Password Management</h3>
//                   <p className="text-sm text-muted-foreground mb-4">Reset passwords for staff members who have been locked out or forgotten their credentials.</p>

//                   <Button variant="outline" className="flex items-center gap-2" onClick={() => window.location.href = "/password-reset"}>
//                     <Lock className="h-4 w-4" />
//                     Password Reset Tool
//                   </Button>
//                 </div>

//                 <Separator />

//                 <div>
//                   <h3 className="text-lg font-medium mb-2">Account Security</h3>
//                   <p className="text-sm text-muted-foreground mb-4">Configure the following security settings for your practice.</p>

//                   <div className="space-y-4">
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
//                         <Input id="session-timeout" type="number" min="5" max="120" value={(practice as any)?.sessionTimeoutMinutes || 30} disabled />
//                         <p className="text-xs text-muted-foreground">Time in minutes before an inactive session is logged out</p>
//                       </div>

//                       <div className="space-y-2">
//                         <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
//                         <Input id="max-login-attempts" type="number" min="3" max="10" value={(practice as any)?.maxLoginAttempts || 5} disabled />
//                         <p className="text-xs text-muted-foreground">Number of failed attempts before account is locked</p>
//                       </div>
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="lockout-duration">Account Lockout Duration (minutes)</Label>
//                       <Input id="lockout-duration" type="number" min="15" max="1440" value={(practice as any)?.accountLockoutMinutes || 30} disabled />
//                       <p className="text-xs text-muted-foreground">Time an account remains locked after exceeding max login attempts</p>
//                     </div>
//                   </div>

//                   <div className="mt-4">
//                     <p className="text-sm text-amber-600 flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Security settings can only be configured by a system administrator</p>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
