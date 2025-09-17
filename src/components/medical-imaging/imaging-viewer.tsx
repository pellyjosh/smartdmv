import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import AnnotationTools from "./annotation-tools";
import MeasurementTools from "./measurement-tools";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Download,
  List,
} from "lucide-react";
import LoadingSpinner from "../loading-spinner";

interface ImagingViewerProps {
  seriesId: string;
  petId?: number;
  initialImageIndex?: number;
  imageUrl?: string;
  title?: string;
  description?: string;
  annotations?: any[];
  measurements?: any[];
  onAnnotationAdded?: (annotation: any) => void;
  onMeasurementAdded?: (measurement: any) => void;
}

type Annotation = {
  id: number;
  seriesId: number;
  shape: string;
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  createdAt: string;
  createdBy: number;
  createdByName?: string;
  // Add database fields for stored annotations
  annotation_data?: string;
  annotationType?: string;
  text?: string;
  color?: string;
};

type Measurement = {
  id: number;
  seriesId: number;
  type: string;
  unit: string;
  value: string;
  notes?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  points?: { x: number; y: number }[];
  createdAt: string;
  createdBy: number;
  createdByName?: string;
};

type Image = {
  id: number;
  seriesId: number;
  url: string;
  fileName: string;
  fileType: string;
  position: number;
  createdAt: string;
  metadata?: any;
};

type Series = {
  id: number;
  petId: number;
  practiceId: number;
  studyType: string;
  studyDate: string;
  description: string;
  bodyPart: string;
  images: Image[];
  annotations: Annotation[];
  measurements: Measurement[];
  createdAt: string;
  createdBy: number;
  createdByName?: string;
};

const ImagingViewer: React.FC<ImagingViewerProps> = ({
  seriesId,
  petId,
  initialImageIndex = 0,
  imageUrl,
  title,
  description,
  annotations = [],
  measurements = [],
  onAnnotationAdded,
  onMeasurementAdded,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(initialImageIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeAnnotations, setActiveAnnotations] = useState<Annotation[]>([]);
  const [activeMeasurements, setActiveMeasurements] = useState<Measurement[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("view");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawingMode, setDrawingMode] = useState<string | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<any>(null);
  
  // Annotation preview state
  const [annotationPreview, setAnnotationPreview] = useState<any>(null);
  const [annotationDrawing, setAnnotationDrawing] = useState<boolean>(false);
  const [annotationMouseHandlers, setAnnotationMouseHandlers] = useState<any>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Sync props with state
  useEffect(() => {
    setActiveAnnotations(annotations || []);
    setActiveMeasurements(measurements || []);
  }, [annotations, measurements]);

  // Update annotations and measurements when props change
  useEffect(() => {
    setActiveAnnotations(annotations);
    setActiveMeasurements(measurements);
  }, [annotations, measurements]);

  // Create a series object from props for compatibility
  const series: Series = {
    id: parseInt(seriesId),
    petId: petId || 0,
    practiceId: 0,
    studyType: title || 'Medical Image',
    studyDate: new Date().toISOString(),
    description: description || '',
    bodyPart: '',
    images: imageUrl ? [{
      id: 1,
      seriesId: parseInt(seriesId),
      url: imageUrl,
      fileName: 'medical-image.jpg',
      fileType: 'image/jpeg',
      position: 1,
      createdAt: new Date().toISOString(),
    }] : [],
    annotations: activeAnnotations,
    measurements: activeMeasurements,
    createdAt: new Date().toISOString(),
    createdBy: 1,
  };

  const isLoading = false;
  const error = null;

  // Generate placeholder image data URL
  const getPlaceholderImage = () => {
    const svg = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280">
          Medical Image
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Handle image load errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = getPlaceholderImage();
  };

  // Drawing utilities
  const getRelativePosition = (event: React.MouseEvent): { x: number; y: number } | null => {
    if (!imageRef.current) return null;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    return { x, y };
  };

  // Start drawing interaction
  const startDrawing = (mode: string) => {
    setDrawingMode(mode);
    setSelectedTab("view"); // Switch to view tab for drawing
  };

  // Handle mouse events for drawing
  const handleImageMouseDown = (event: React.MouseEvent) => {
    if (!drawingMode) return;
    
    const position = getRelativePosition(event);
    if (!position) return;
    
    setIsDrawing(true);
    setCurrentDrawing({
      startX: position.x,
      startY: position.y,
      currentX: position.x,
      currentY: position.y,
      mode: drawingMode
    });
  };

  const handleImageMouseMove = (event: React.MouseEvent) => {
    if (!isDrawing || !currentDrawing) return;
    
    const position = getRelativePosition(event);
    if (!position) return;
    
    setCurrentDrawing((prev: any) => ({
      ...prev,
      currentX: position.x,
      currentY: position.y
    }));
  };

  const handleImageMouseUp = (event: React.MouseEvent) => {
    if (!isDrawing || !currentDrawing) return;
    
    setIsDrawing(false);
    
    // Complete the drawing and show form to add details
    const position = getRelativePosition(event);
    if (!position) return;
    
    // Create annotation or measurement based on drawing mode
    const drawingData = {
      ...currentDrawing,
      endX: position.x,
      endY: position.y
    };
    
    setCurrentDrawing(drawingData);
    // Keep the drawing mode active so user can fill in details
  };

  // Cancel current drawing
  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingMode(null);
    setCurrentDrawing(null);
  };

  // Render current drawing preview
  const renderCurrentDrawing = () => {
    if (!currentDrawing) return null;

    const { startX, startY, currentX, currentY, mode } = currentDrawing;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (mode === "rectangle") {
      return (
        <div
          className="absolute border-2 border-red-400 bg-red-400/10"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            pointerEvents: "none",
          }}
        />
      );
    }

    if (mode === "circle") {
      return (
        <div
          className="absolute border-2 border-red-400 bg-red-400/10 rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${width}%`, // Force circle to be square
            pointerEvents: "none",
          }}
        />
      );
    }

    if (mode === "line") {
      const angle = Math.atan2(currentY - startY, currentX - startX) * 180 / Math.PI;
      const length = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
      
      return (
        <div
          className="absolute border-t-2 border-blue-400"
          style={{
            left: `${startX}%`,
            top: `${startY}%`,
            width: `${length}%`,
            transformOrigin: "0 0",
            transform: `rotate(${angle}deg)`,
            pointerEvents: "none",
          }}
        />
      );
    }

    return null;
  };

  // Effect to enter/exit fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        toast({
          title: "Fullscreen Error",
          description: `Error attempting to enable fullscreen: ${err.message}`,
          variant: "destructive",
        });
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Zoom functions
  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 4));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Rotation functions
  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Reset view
  const resetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  // Download current image
  const downloadImage = () => {
    if (!series || series.images.length === 0) return;

    const image = series.images[currentImageIndex];
    const link = document.createElement("a");
    link.href = image.url;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigate to previous/next image
  const previousImage = () => {
    if (!series || series.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev === 0 ? series.images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    if (!series || series.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev === series.images.length - 1 ? 0 : prev + 1));
  };

  // Handle new annotation
  const handleAnnotationAdded = (annotation: Annotation) => {
    setActiveAnnotations((prev) => [...prev, annotation]);
    toast({
      title: "Annotation Added",
      description: `${annotation.shape} annotation "${annotation.label}" has been added to the image.`,
    });
    setSelectedTab("view");
    
    // Call parent callback to update the query cache
    if (onAnnotationAdded) {
      onAnnotationAdded(annotation);
    }
  };

  // Handle new measurement
  const handleMeasurementAdded = (measurement: Measurement) => {
    setActiveMeasurements((prev) => [...prev, measurement]);
    toast({
      title: "Measurement Added",
      description: `${measurement.type} measurement of ${measurement.value} ${measurement.unit} has been added to the image.`,
    });
    setSelectedTab("view");
    
    // Call parent callback to update the query cache
    if (onMeasurementAdded) {
      onMeasurementAdded(measurement);
    }
  };

  // Render annotations on the image
  const renderAnnotations = () => {
    if (!activeAnnotations || activeAnnotations.length === 0) return null;

    console.log('Rendering annotations from state:', activeAnnotations);

    return activeAnnotations.map((annotation) => {
      // Parse annotation data if it's from the database (string format)
      let annotationData = annotation;
      if (typeof annotation.annotation_data === 'string') {
        try {
          const parsedData = JSON.parse(annotation.annotation_data);
          annotationData = {
            ...annotation,
            ...parsedData, // Spread the parsed data (shape, x, y, width, height, etc.)
          };
          console.log('Parsed annotation data:', annotationData);
        } catch (error) {
          console.error('Error parsing annotation data:', error);
          return null;
        }
      }

      // Use the annotationType field if shape is not available
      const shape = annotationData.shape || annotation.annotationType;

      if (shape === "rectangle") {
        return (
          <div
            key={annotation.id}
            className="absolute border-2 border-yellow-400 bg-yellow-400/10"
            style={{
              left: `${annotationData.x}%`,
              top: `${annotationData.y}%`,
              width: `${annotationData.width}%`,
              height: `${annotationData.height}%`,
              pointerEvents: "none",
            }}
            title={annotationData.label || annotation.text || ''}
          />
        );
      }

      if (shape === "circle") {
        return (
          <div
            key={annotation.id}
            className="absolute border-2 border-yellow-400 bg-yellow-400/10 rounded-full"
            style={{
              left: `${annotationData.x}%`,
              top: `${annotationData.y}%`,
              width: `${annotationData.width}%`,
              height: `${annotationData.height}%`,
              pointerEvents: "none",
            }}
            title={annotationData.label || annotation.text || ''}
          />
        );
      }

      if (shape === "text") {
        return (
          <div
            key={annotation.id}
            className="absolute bg-yellow-400 text-black text-xs px-1 py-0.5 rounded"
            style={{
              left: `${annotationData.x}%`,
              top: `${annotationData.y}%`,
              pointerEvents: "none",
            }}
          >
            {annotationData.label || annotation.text || ''}
          </div>
        );
      }

      if (shape === "freehand" && (annotationData.points || annotation.points)) {
        const points = annotationData.points || annotation.points;
        if (points) {
          const pathPoints = points.map((p: { x: number; y: number }) => `${p.x}%,${p.y}%`).join(" ");

          return (
            <div
              key={annotation.id}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              title={annotationData.label || annotation.text || ''}
            >
              <svg className="absolute top-0 left-0 w-full h-full">
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="rgba(250, 204, 21, 0.8)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          );
        }
      }

      return null;
    });
  };

  // Render annotation preview while drawing
  const renderAnnotationPreview = () => {
    if (!annotationPreview) {
      console.log('No annotation preview data');
      return null;
    }
    
    console.log('Rendering annotation preview:', annotationPreview);
    
    const { previewAnnotation, freehandPoints, shape } = annotationPreview;
    
    if (shape === "freehand" && freehandPoints && freehandPoints.length > 0) {
      const pathPoints = freehandPoints.map((p: any) => `${p.x}%,${p.y}%`).join(" ");
      
      return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <svg className="absolute top-0 left-0 w-full h-full">
            <polyline
              points={pathPoints}
              fill="none"
              stroke="rgba(250, 204, 21, 0.8)"
              strokeWidth="2"
            />
          </svg>
        </div>
      );
    }
    
    if (!previewAnnotation) return null;
    
    if (previewAnnotation.shape === "rectangle") {
      return (
        <div
          className="absolute border-2 border-yellow-400 bg-yellow-400/10"
          style={{
            left: `${previewAnnotation.x}%`,
            top: `${previewAnnotation.y}%`,
            width: `${previewAnnotation.width}%`,
            height: `${previewAnnotation.height}%`,
            pointerEvents: 'none'
          }}
        />
      );
    }
    
    if (previewAnnotation.shape === "circle") {
      return (
        <div
          className="absolute border-2 border-yellow-400 bg-yellow-400/10 rounded-full"
          style={{
            left: `${previewAnnotation.x}%`,
            top: `${previewAnnotation.y}%`,
            width: `${previewAnnotation.width}%`,
            height: `${previewAnnotation.height}%`,
            pointerEvents: 'none'
          }}
        />
      );
    }
    
    if (previewAnnotation.shape === "text") {
      return (
        <div
          className="absolute bg-yellow-400 text-black text-xs px-1 py-0.5 rounded"
          style={{
            left: `${previewAnnotation.x}%`,
            top: `${previewAnnotation.y}%`,
            pointerEvents: 'none'
          }}
        >
          Text annotation
        </div>
      );
    }
    
    return null;
  };

  // Render measurements on the image
  const renderMeasurements = () => {
    if (!series || !series.measurements) return null;

    // Combine existing measurements with active ones
    const allMeasurements = [...(series.measurements || []), ...activeMeasurements];

    return allMeasurements.map((measurement) => {
      if (measurement.type === "line" && measurement.startX !== undefined) {
        return (
          <div
            key={measurement.id}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            title={measurement.notes}
          >
            <svg className="absolute top-0 left-0 w-full h-full">
              <line
                x1={`${measurement.startX}%`}
                y1={`${measurement.startY}%`}
                x2={`${measurement.endX}%`}
                y2={`${measurement.endY}%`}
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="2"
              />
            </svg>
            <span
              className="absolute bg-blue-500 text-white text-xs px-1 py-0.5 rounded"
              style={{
                left: `${((measurement.startX || 0) + (measurement.endX || 0)) / 2}%`,
                top: `${((measurement.startY || 0) + (measurement.endY || 0)) / 2 - 2}%`,
              }}
            >
              {measurement.value} {measurement.unit}
            </span>
          </div>
        );
      }

      if (measurement.type === "area" && measurement.startX !== undefined) {
        const width = Math.abs((measurement.endX || 0) - (measurement.startX || 0));
        const height = Math.abs((measurement.endY || 0) - (measurement.startY || 0));
        const x = Math.min(measurement.startX || 0, measurement.endX || 0);
        const y = Math.min(measurement.startY || 0, measurement.endY || 0);

        return (
          <div
            key={measurement.id}
            className="absolute border-2 border-blue-500 bg-blue-500/10"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${width}%`,
              height: `${height}%`,
              pointerEvents: "none",
            }}
            title={measurement.notes}
          >
            <span className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
              {measurement.value} {measurement.unit}²
            </span>
          </div>
        );
      }

      if (measurement.type === "circumference" && measurement.startX !== undefined) {
        const radius = Math.sqrt(
          Math.pow((measurement.endX || 0) - (measurement.startX || 0), 2) +
            Math.pow((measurement.endY || 0) - (measurement.startY || 0), 2)
        );

        return (
          <div
            key={measurement.id}
            className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-full"
            style={{
              left: `${(measurement.startX || 0) - radius}%`,
              top: `${(measurement.startY || 0) - radius}%`,
              width: `${radius * 2}%`,
              height: `${radius * 2}%`,
              pointerEvents: "none",
            }}
            title={measurement.notes}
          >
            <span className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
              {measurement.value} {measurement.unit}
            </span>
          </div>
        );
      }

      if (measurement.type === "angle" && measurement.points && measurement.points.length === 3) {
        const [p1, p2, p3] = measurement.points;

        return (
          <div
            key={measurement.id}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            title={measurement.notes}
          >
            <svg className="absolute top-0 left-0 w-full h-full">
              <line
                x1={`${p1.x}%`}
                y1={`${p1.y}%`}
                x2={`${p2.x}%`}
                y2={`${p2.y}%`}
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="2"
              />
              <line
                x1={`${p2.x}%`}
                y1={`${p2.y}%`}
                x2={`${p3.x}%`}
                y2={`${p3.y}%`}
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="2"
              />
              <circle
                cx={`${p2.x}%`}
                cy={`${p2.y}%`}
                r="3"
                fill="rgba(59, 130, 246, 0.8)"
              />
            </svg>
            <span
              className="absolute bg-blue-500 text-white text-xs px-1 py-0.5 rounded"
              style={{
                left: `${p2.x + 2}%`,
                top: `${p2.y - 2}%`,
              }}
            >
              {measurement.value}°
            </span>
          </div>
        );
      }

      return null;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error || !series || series.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 bg-muted rounded-lg">
        <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Images</h3>
        <p className="text-muted-foreground text-center">
          {error
            ? "There was an error loading the imaging series. Please try again."
            : "No images found in this series."}
        </p>
      </div>
    );
  }

  // Current image
  const currentImage = series.images[currentImageIndex];

  return (
    <div ref={containerRef} className={isFullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <span>{series.description || "Medical Image"}</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {series.studyType} - {series.bodyPart} - {new Date(series.studyDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="annotate">Annotate</TabsTrigger>
              <TabsTrigger value="measure">Measure</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-4">
            {/* Main Image Viewer */}
            <div className="relative rounded-md overflow-hidden bg-black mb-4">
              <div
                className="relative flex items-center justify-center"
                style={{
                  paddingTop: rotation % 180 !== 0 ? "100%" : "75%", // Adjust aspect ratio based on rotation
                }}
              >
                <img
                  ref={imageRef}
                  src={currentImage.url}
                  alt={`Medical image ${currentImageIndex + 1}`}
                  className="absolute inset-0 max-w-full max-h-full m-auto object-contain"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoomLevel})`,
                    transition: "transform 0.2s ease",
                  }}
                  onError={handleImageError}
                />
                
                {/* Drawing overlay */}
                {(drawingMode || selectedTab === "annotate") && (
                  <div 
                    className="absolute inset-0 cursor-crosshair"
                    onMouseDown={selectedTab === "annotate" && annotationMouseHandlers ? annotationMouseHandlers.onMouseDown : handleImageMouseDown}
                    onMouseMove={selectedTab === "annotate" && annotationMouseHandlers ? annotationMouseHandlers.onMouseMove : handleImageMouseMove}
                    onMouseUp={selectedTab === "annotate" && annotationMouseHandlers ? annotationMouseHandlers.onMouseUp : handleImageMouseUp}
                  />
                )}
                
                {selectedTab === "view" && (
                  <>
                    {renderAnnotations()}
                    {renderMeasurements()}
                    {renderCurrentDrawing()}
                  </>
                )}
                
                {selectedTab === "annotate" && renderAnnotationPreview()}
              </div>
            </div>

            {/* Different tab contents */}
            <TabsContent value="view" className="mt-0">
              <div className="flex justify-between items-center mt-4">
                <div className="space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={zoomIn}
                    title="Zoom In"
                  >
                    <ZoomIn size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={zoomOut}
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={rotateCounterClockwise}
                    title="Rotate Left"
                  >
                    <RotateCcw size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={rotateClockwise}
                    title="Rotate Right"
                  >
                    <RotateCw size={18} />
                  </Button>
                </div>
                
                <div className="text-sm">
                  Image {currentImageIndex + 1} of {series.images.length}
                </div>
                
                <div className="space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resetView}
                    title="Reset View"
                  >
                    <RotateCcw size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={downloadImage}
                    title="Download Image"
                  >
                    <Download size={18} />
                  </Button>
                </div>
              </div>

              {/* Thumbnail navigation */}
              {series.images.length > 1 && (
                <div className="mt-4 relative">
                  <div className="flex overflow-x-auto py-2 gap-2">
                    {series.images.map((image, idx) => (
                      <button
                        key={image.id}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative flex-shrink-0 w-16 h-16 border-2 rounded ${
                          idx === currentImageIndex
                            ? "border-primary"
                            : "border-muted"
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Annotations and measurements list */}
              {(series.annotations?.length > 0 || series.measurements?.length > 0) && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm flex items-center mb-2">
                    <List className="mr-2 h-4 w-4" /> Analysis Markups
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {series.annotations && series.annotations.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium text-muted-foreground mb-1">Annotations</h5>
                        {series.annotations.map((annotation) => (
                          <div
                            key={annotation.id}
                            className="text-xs bg-muted/50 p-1 rounded"
                          >
                            <span className="font-medium">{annotation.shape}: </span>
                            {annotation.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {series.measurements && series.measurements.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium text-muted-foreground mb-1">Measurements</h5>
                        {series.measurements.map((measurement) => (
                          <div
                            key={measurement.id}
                            className="text-xs bg-muted/50 p-1 rounded"
                          >
                            <span className="font-medium">{measurement.type}: </span>
                            {measurement.value} {measurement.unit}
                            {measurement.type === "area" && "²"}
                            {measurement.type === "angle" && "°"}
                            {measurement.notes && (
                              <span className="block text-muted-foreground ml-4">
                                Note: {measurement.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="annotate" className="mt-0">
              <AnnotationTools
                imageRef={imageRef}
                seriesId={parseInt(seriesId)}
                onAnnotationAdded={handleAnnotationAdded}
                onPreviewChange={setAnnotationPreview}
                onDrawingStateChange={setAnnotationDrawing}
                onMouseHandlers={setAnnotationMouseHandlers}
              />
            </TabsContent>

            <TabsContent value="measure" className="mt-0">
              <MeasurementTools
                imageRef={imageRef}
                seriesId={parseInt(seriesId)}
                onMeasurementAdded={handleMeasurementAdded}
              />
            </TabsContent>
          </CardContent>

          <CardFooter className="flex justify-between">
            {series.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  onClick={previousImage}
                  disabled={series.images.length <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={nextImage}
                  disabled={series.images.length <= 1}
                >
                  Next
                </Button>
              </>
            )}
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
};

export default ImagingViewer;