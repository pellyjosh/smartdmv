import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Pen, 
  Check, 
  X 
} from "lucide-react";

interface AnnotationToolsProps {
  imageRef: React.RefObject<HTMLImageElement>;
  seriesId: string;
  onAnnotationAdded?: (annotation: any) => void;
}

// Annotation schema for form validation
const annotationSchema = z.object({
  shape: z.enum(["rectangle", "circle", "text", "freehand"]),
  label: z.string().min(1, "Label is required"),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number()
  })).optional(),
  seriesId: z.number()
});

type AnnotationFormValues = z.infer<typeof annotationSchema>;

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  imageRef,
  seriesId,
  onAnnotationAdded
}) => {
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [previewAnnotation, setPreviewAnnotation] = useState<any | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<{ x: number, y: number }[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Initialize form with default values
  const form = useForm<AnnotationFormValues>({
    resolver: zodResolver(annotationSchema),
    defaultValues: {
      shape: "rectangle",
      label: "",
      seriesId: seriesId
    }
  });
  
  const { shape } = form.watch();
  
  // Update seriesId when prop changes
  useEffect(() => {
    form.setValue('seriesId', seriesId);
  }, [seriesId, form]);
  
  // Mutation for saving annotations
  const createAnnotationMutation = useMutation({
    mutationFn: async (data: AnnotationFormValues) => {
      const response = await apiRequest("POST", `/api/imaging-series/${seriesId}/annotations`, data);
      return response.json();
    },
    onSuccess: (data) => {
      // Reset form and drawing state
      form.reset({
        shape: "rectangle",
        label: "",
        seriesId: seriesId
      });
      setPreviewAnnotation(null);
      setFreehandPoints([]);
      
      // Notify parent component
      if (onAnnotationAdded) {
        onAnnotationAdded(data);
      }
    }
  });
  
  // Get cursor position relative to image
  const getCursorPosition = (event: React.MouseEvent): { x: number, y: number } | null => {
    if (!imageRef.current) return null;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    return { x, y };
  };
  
  // Prepare annotation data for submission
  const prepareAnnotationData = (): AnnotationFormValues => {
    const data = form.getValues();
    
    if (shape === "freehand") {
      return {
        ...data,
        points: freehandPoints
      };
    }
    
    if (previewAnnotation) {
      return {
        ...data,
        x: previewAnnotation.x,
        y: previewAnnotation.y,
        width: previewAnnotation.width,
        height: previewAnnotation.height
      };
    }
    
    return data;
  };
  
  // Handle form submission
  const onSubmit = () => {
    const data = prepareAnnotationData();
    
    // Validate that we have the necessary data based on shape
    if (shape === "rectangle" || shape === "circle") {
      if (!previewAnnotation) {
        form.setError("shape", { message: "Please draw the shape on the image" });
        return;
      }
    } else if (shape === "text") {
      if (!previewAnnotation) {
        form.setError("shape", { message: "Please click where to place the text" });
        return;
      }
    } else if (shape === "freehand") {
      if (freehandPoints.length < 2) {
        form.setError("shape", { message: "Please draw a freehand line" });
        return;
      }
    }
    
    createAnnotationMutation.mutate(data);
  };
  
  // Cancel current annotation
  const handleCancel = () => {
    setPreviewAnnotation(null);
    setFreehandPoints([]);
    setIsDrawing(false);
  };
  
  // Mouse down handler for starting annotation
  const handleMouseDown = (event: React.MouseEvent) => {
    const position = getCursorPosition(event);
    if (!position) return;
    
    if (shape === "text") {
      setPreviewAnnotation({
        shape,
        x: position.x,
        y: position.y
      });
      return;
    }
    
    if (shape === "freehand") {
      setIsDrawing(true);
      setFreehandPoints([position]);
      return;
    }
    
    setIsDrawing(true);
    setStartPoint(position);
    setPreviewAnnotation({
      shape,
      x: position.x,
      y: position.y,
      width: 0,
      height: 0
    });
  };
  
  // Mouse move handler for drawing
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const currentPosition = getCursorPosition(event);
    if (!currentPosition) return;
    
    if (shape === "freehand") {
      setFreehandPoints(prev => [...prev, currentPosition]);
      return;
    }
    
    if (!startPoint) return;
    
    const width = currentPosition.x - startPoint.x;
    const height = currentPosition.y - startPoint.y;
    
    // For rectangle and circle, update dimensions
    setPreviewAnnotation({
      shape,
      x: width >= 0 ? startPoint.x : currentPosition.x,
      y: height >= 0 ? startPoint.y : currentPosition.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };
  
  // Mouse up handler for finishing drawing
  const handleMouseUp = (event: React.MouseEvent) => {
    if (!isDrawing) return;
    
    if (shape === "freehand") {
      // Finish freehand drawing
      setIsDrawing(false);
      return;
    }
    
    const currentPosition = getCursorPosition(event);
    if (!currentPosition || !startPoint) return;
    
    const width = currentPosition.x - startPoint.x;
    const height = currentPosition.y - startPoint.y;
    
    // For rectangle and circle, finalize dimensions
    setPreviewAnnotation({
      shape,
      x: width >= 0 ? startPoint.x : currentPosition.x,
      y: height >= 0 ? startPoint.y : currentPosition.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
    
    setIsDrawing(false);
  };
  
  // Render preview of current annotation
  const renderPreview = () => {
    if (shape === "freehand" && freehandPoints.length > 0) {
      const pathPoints = freehandPoints.map(p => `${p.x}%,${p.y}%`).join(" ");
      
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
      const label = form.getValues().label || "Add label";
      
      return (
        <div
          className="absolute bg-yellow-400 text-black text-xs px-1 py-0.5 rounded"
          style={{
            left: `${previewAnnotation.x}%`,
            top: `${previewAnnotation.y}%`,
            pointerEvents: 'none'
          }}
        >
          {typeof label === "string" ? label : String(label)}
        </div>
      );
    }
    
    return null;
  };
  
  // Instruction text based on current annotation shape
  const getInstructionText = () => {
    switch (shape) {
      case "rectangle":
        return "Click and drag to create a rectangular annotation";
      case "circle":
        return "Click and drag to create a circular annotation";
      case "text":
        return "Click to place a text annotation";
      case "freehand":
        return "Click and drag to draw a freehand line";
      default:
        return "Select a shape and annotate the image";
    }
  };
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Annotation Tools</h3>
      
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="shape"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annotation Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleCancel(); // Reset when changing shape
                  }}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an annotation type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rectangle">
                      <div className="flex items-center">
                        <Square className="h-4 w-4 mr-2" />
                        <span>Rectangle</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="circle">
                      <div className="flex items-center">
                        <CircleIcon className="h-4 w-4 mr-2" />
                        <span>Circle</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="text">
                      <div className="flex items-center">
                        <Type className="h-4 w-4 mr-2" />
                        <span>Text</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="freehand">
                      <div className="flex items-center">
                        <Pen className="h-4 w-4 mr-2" />
                        <span>Freehand</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Describe what you're annotating" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Update text preview if active
                      if (previewAnnotation && previewAnnotation.shape === "text") {
                        setPreviewAnnotation({
                          ...previewAnnotation
                        });
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              {getInstructionText()}
            </p>
            
            <div 
              ref={canvasRef}
              className="relative h-40 border border-dashed rounded-md bg-muted/50 flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {!previewAnnotation && freehandPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">Annotation preview area</p>
              ) : (
                renderPreview()
              )}
            </div>
          </div>
          
          {(previewAnnotation || freehandPoints.length > 0) && (
            <div className="flex justify-between mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSubmit}
                disabled={createAnnotationMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" /> Save Annotation
              </Button>
            </div>
          )}
        </div>
      </Form>
    </div>
  );
};

export default AnnotationTools;