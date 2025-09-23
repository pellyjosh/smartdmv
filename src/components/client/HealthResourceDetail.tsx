import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Heart,
  Activity,
  AlertCircle,
  PawPrint,
  Stethoscope,
  Clock,
  Eye,
  User,
  Calendar,
  Phone,
  MapPin,
  ExternalLink,
  Download,
  X,
} from "lucide-react";
import { format } from "@/lib/date-utils";
import { queryClient } from "@/lib/queryClient";

interface HealthResourceDetailProps {
  resourceId: number;
  trigger: React.ReactNode;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "wellness":
      return <Heart className="h-5 w-5 text-red-500" />;
    case "nutrition":
      return <Activity className="h-5 w-5 text-green-500" />;
    case "emergency":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "behavior":
      return <PawPrint className="h-5 w-5 text-blue-500" />;
    case "vaccination":
      return <Stethoscope className="h-5 w-5 text-purple-500" />;
    case "preventive-care":
      return <Heart className="h-5 w-5 text-pink-500" />;
    case "dental-care":
      return <Stethoscope className="h-5 w-5 text-blue-600" />;
    case "senior-care":
      return <Clock className="h-5 w-5 text-orange-500" />;
    default:
      return <Heart className="h-5 w-5 text-gray-500" />;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800";
    case "advanced":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const HealthResourceDetail = ({
  resourceId,
  trigger,
}: HealthResourceDetailProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch detailed resource data
  const {
    data: resource,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/health-resources/${resourceId}`, resourceId],
    queryFn: async () => {
      const res = await fetch(`/api/health-resources/${resourceId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch resource details");
      }
      return await res.json();
    },
    enabled: isOpen && !!resourceId,
  });

  // Mutation to increment view count
  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/health-resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resourceId }),
      });
      if (!res.ok) {
        throw new Error("Failed to increment view count");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch resource data to update view count
      queryClient.invalidateQueries({
        queryKey: [`/api/health-resources/${resourceId}`, resourceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/health-resources"],
      });
    },
  });

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Increment view count when opening the resource
      incrementViewMutation.mutate();
    }
  };

  const formatContent = (content: string) => {
    // Convert markdown-like content to HTML
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-2xl font-bold mb-4 mt-6">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-xl font-semibold mb-3 mt-5">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        return (
          <h3 key={index} className="text-lg font-medium mb-2 mt-4">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        return (
          <li key={index} className="ml-4">
            {line.substring(2)}
          </li>
        );
      } else if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={index} className="font-semibold mb-2">
            {line.slice(2, -2)}
          </p>
        );
      } else if (line.trim() === "") {
        return <br key={index} />;
      } else {
        return (
          <p key={index} className="mb-2 leading-relaxed">
            {line}
          </p>
        );
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Resource</h3>
            <p className="text-muted-foreground">
              Failed to load the resource details. Please try again.
            </p>
          </div>
        ) : resource ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(resource.category)}
                    <Badge variant="secondary" className="capitalize">
                      {resource.category.replace("-", " ")}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {resource.type}
                    </Badge>
                    {resource.species !== "all" && (
                      <Badge variant="outline" className="capitalize">
                        {resource.species}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-2xl font-bold mb-2">
                    {resource.title}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {resource.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Resource Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              {resource.author && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {resource.author}
                </div>
              )}
              {resource.estimatedReadTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {resource.estimatedReadTime}
                </div>
              )}
              {resource.difficulty && (
                <Badge className={getDifficultyColor(resource.difficulty)}>
                  {resource.difficulty}
                </Badge>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {resource.viewCount} views
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(resource.createdAt), "MMM d, YYYY")}
              </div>
            </div>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="mb-6" />

            {/* Emergency Contact Information */}
            {resource.type === "emergency-contact" && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Emergency Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {resource.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-red-600" />
                        <a
                          href={`tel:${resource.contactPhone}`}
                          className="font-semibold text-red-800 hover:underline"
                        >
                          {resource.contactPhone}
                        </a>
                      </div>
                    )}
                    {resource.contactAddress && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-600" />
                        <span className="text-red-800">
                          {resource.contactAddress}
                        </span>
                      </div>
                    )}
                    {resource.availability && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-red-600" />
                        <span className="text-red-800">
                          {resource.availability}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content */}
            {resource.content && (
              <div className="prose prose-sm max-w-none mb-6">
                <div className="space-y-2">
                  {formatContent(resource.content)}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              {resource.externalUrl && (
                <Button variant="outline" asChild>
                  <a
                    href={resource.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit External Link
                  </a>
                </Button>
              )}
              {resource.downloadUrl && (
                <Button variant="outline" asChild>
                  <a href={resource.downloadUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Resource
                  </a>
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
