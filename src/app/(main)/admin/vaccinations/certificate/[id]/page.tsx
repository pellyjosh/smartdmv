"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePractice } from "@/hooks/use-practice";
import { HeartPulseLogo } from "@/components/icons/heart-pulse-logo";
import Link from "next/link";

export default function VaccinationCertificatePage() {
  const params = useParams();
  const id = params.id as string | undefined;
  const { toast } = useToast();
  const { practice } = usePractice();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch vaccination details
  const {
    data: vaccination,
    isLoading: isLoadingVaccination,
    error: vaccinationError,
  } = useQuery({
    queryKey: ["/api/vaccinations", id],
    queryFn: async () => {
      const response = await fetch(`/api/vaccinations/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch vaccination");
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch pet details
  const {
    data: pet,
    isLoading: isLoadingPet,
    error: petError,
  } = useQuery({
    queryKey: ["/api/pets", vaccination?.petId],
    queryFn: async () => {
      const response = await fetch(`/api/pets/${vaccination.petId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pet details");
      }
      return response.json();
    },
    enabled: !!vaccination?.petId,
  });

  // Fetch pet owner details
  const {
    data: owner,
    isLoading: isLoadingOwner,
    error: ownerError,
  } = useQuery({
    queryKey: ["/api/users", pet?.ownerId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${pet.ownerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch owner details");
      }
      return response.json();
    },
    enabled: !!pet?.ownerId,
  });

  const isLoading = isLoadingVaccination || isLoadingPet || isLoadingOwner;
  const error = vaccinationError || petError || ownerError;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (e) {
      return "N/A";
    }
  };

  const getVaccinationField = (vacc: any, ...keys: string[]) => {
    if (!vacc) return "N/A";
    for (const k of keys) {
      const v = vacc[k as keyof typeof vacc];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "N/A";
  };

  const getOwnerField = (ownerObj: any, ...keys: string[]) => {
    if (!ownerObj) return "N/A";
    for (const k of keys) {
      const v = ownerObj[k as keyof typeof ownerObj];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "N/A";
  };

  const certRef = useRef<HTMLDivElement | null>(null);

  // Utility to inline computed styles from source -> target recursively
  const inlineComputedStyles = (source: HTMLElement, target: HTMLElement) => {
    try {
      const sourceChildren = Array.from(
        source.querySelectorAll("*")
      ) as HTMLElement[];
      const targetChildren = Array.from(
        target.querySelectorAll("*")
      ) as HTMLElement[];

      // Apply styles to root
      const rootStyle = window.getComputedStyle(source);
      (target as HTMLElement).style.cssText = rootStyle.cssText || "";

      for (let i = 0; i < sourceChildren.length; i++) {
        const s = sourceChildren[i];
        const t = targetChildren[i] as HTMLElement | undefined;
        if (!t) continue;
        const cs = window.getComputedStyle(s);
        t.style.cssText = cs.cssText || "";
      }
    } catch (e) {
      // best-effort; if anything fails, fall back to stylesheet copy
      console.warn("inlineComputedStyles failed", e);
    }
  };

  const handlePrint = () => {
    const el = certRef.current;
    if (!el) return;

    const ensureHtml2Canvas = () =>
      new Promise<void>((resolve, reject) => {
        // @ts-ignore
        if ((window as any).html2canvas) return resolve();
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
      });

    (async () => {
      try {
        await ensureHtml2Canvas();

        // hide no-export elements temporarily
        const noExportNodes = Array.from(
          el.querySelectorAll(".no-export")
        ) as HTMLElement[];
        const prevDisplays: string[] = [];
        noExportNodes.forEach((n) => {
          prevDisplays.push(n.style.display || "");
          n.style.display = "none";
        });

        // @ts-ignore
        const canvas = await (window as any).html2canvas(el, {
          scale: 2,
          useCORS: true,
        });

        // restore
        noExportNodes.forEach((n, i) => {
          n.style.display = prevDisplays[i];
        });

        const dataUrl = canvas.toDataURL("image/png");
        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) return;

        // Create a minimal HTML that centers the image and fits A4 print
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Vaccination Certificate</title>
          <style>
            html,body{height:100%;margin:0;background:white}
            .wrapper{display:flex;align-items:center;justify-content:center;height:100%;padding:20px}
            img{max-width:100%;height:auto;box-shadow:none}
            @media print{ img{max-width:100%;} }
          </style>
        </head><body><div class="wrapper"><img src="${dataUrl}" alt="certificate"/></div></body></html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      } catch (err) {
        console.error("Print failed", err);
        // fallback to previous approach
        window.print();
      }
    })();
  };

  const handleDownload = async () => {
    const el = certRef.current;
    if (!el) return;

    setIsGeneratingPDF(true);

    // Load html2canvas from CDN if not already present on the page
    const ensureHtml2Canvas = () =>
      new Promise<void>((resolve, reject) => {
        // @ts-ignore
        if ((window as any).html2canvas) return resolve();
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
      });

    try {
      await ensureHtml2Canvas();

      // hide .no-export elements during capture
      const noExportNodes = Array.from(
        el.querySelectorAll(".no-export")
      ) as HTMLElement[];
      const previousDisplays: string[] = [];
      noExportNodes.forEach((n) => {
        previousDisplays.push(n.style.display || "");
        n.style.display = "none";
      });

      // @ts-ignore
      const canvas = await (window as any).html2canvas(el, { scale: 2 });

      // restore display
      noExportNodes.forEach((n, i) => {
        n.style.display = previousDisplays[i];
      });
      const dataUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `vaccination-certificate-${id || "certificate"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast({
        title: "Certificate Downloaded",
        description: "The vaccination certificate image has been downloaded.",
      });
    } catch (e) {
      console.error("Failed to generate certificate image", e);
      toast({
        title: "Download Failed",
        description:
          "Unable to generate certificate image. Please try printing instead.",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="shadow-md mb-8">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl">Error</CardTitle>
            <CardDescription>
              Failed to load vaccination certificate. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button asChild>
              <Link href="/admin/vaccinations">Return to Vaccinations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 print:p-0">
      <div className="mb-6 print:hidden">
        <Link href="/admin/vaccinations">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Vaccinations
          </Button>
        </Link>
      </div>

      <div ref={certRef} id="vaccination-certificate">
        <Card className="shadow-md mb-8 print:shadow-none print:border-none">
          <CardHeader className="border-b pb-6 print:pb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {practice?.logoPath ? (
                  <div className="h-12 w-12 overflow-hidden rounded-sm">
                    <img
                      src={`/uploads/${practice.logoPath}`}
                      alt={`${practice?.name || "Practice"} logo`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <HeartPulseLogo className="h-10 w-10 text-primary" />
                )}
                <div>
                  <CardTitle className="text-2xl">
                    Vaccination Certificate
                  </CardTitle>
                  <CardDescription>
                    Official record of administered vaccination
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {isLoading ? (
                    <Skeleton className="h-5 w-40" />
                  ) : (
                    practice?.name || "SmartDVM Practice"
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    practice?.address || "123 Main St, Anytown, USA"
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 print:pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Pet Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        pet?.name || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Species:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        pet?.species || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breed:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-28" />
                      ) : (
                        pet?.breed || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Date of Birth:
                    </span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        formatDate(pet?.dateOfBirth)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Microchip #:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-36" />
                      ) : (
                        pet?.microchipNumber || "N/A"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Owner Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-28" />
                      ) : (
                        owner?.name || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-40" />
                      ) : (
                        owner?.email || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        getOwnerField(owner, "phone", "mobile", "telephone")
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-44" />
                      ) : (
                        getOwnerField(
                          owner,
                          "address",
                          "streetAddress",
                          "line1"
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 print:pt-4">
              <h3 className="text-lg font-semibold mb-4">
                Vaccination Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vaccine Name:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-40" />
                      ) : (
                        vaccination?.vaccineName || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        vaccination?.type || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manufacturer:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-36" />
                      ) : (
                        vaccination?.manufacturer || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lot Number:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-28" />
                      ) : (
                        vaccination?.lotNumber || "N/A"
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin Date:</span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        formatDate(vaccination?.administrationDate)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Expiration Date:
                    </span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        // try expirationDate, then vaccineExpiresAt
                        (() => {
                          const val = getVaccinationField(
                            vaccination,
                            "expirationDate",
                            "vaccineExpiresAt"
                          );
                          return val === "N/A"
                            ? "N/A"
                            : formatDate(val as string);
                        })()
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Next Due Date:
                    </span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        formatDate(vaccination?.nextDueDate)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Administered By:
                    </span>
                    <span className="font-medium">
                      {isLoading ? (
                        <Skeleton className="h-4 w-36" />
                      ) : (
                        getVaccinationField(
                          vaccination,
                          "administratorName",
                          "adminName",
                          "administrator"
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {!isLoading && vaccination?.notes && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Notes:</h4>
                  <p className="text-sm text-muted-foreground">
                    {vaccination.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 mb-4 pt-6 border-t">
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  {practice?.logoPath ? (
                    <div className="h-12 w-12 overflow-hidden">
                      <img
                        src={`/uploads/${practice.logoPath}`}
                        alt={`${practice?.name || "Practice"} logo`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <HeartPulseLogo className="h-12 w-12 text-primary opacity-70" />
                  )}
                </div>
                <p className="font-semibold">
                  This is an official vaccination record for{" "}
                  {pet?.name || "pet"}.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Certificate generated on {format(new Date(), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t pt-4 print:hidden">
            <div className="flex gap-4 w-full justify-end">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="gap-2 no-export"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                onClick={handleDownload}
                disabled={isGeneratingPDF}
                className="gap-2 no-export"
              >
                {isGeneratingPDF ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isGeneratingPDF ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
