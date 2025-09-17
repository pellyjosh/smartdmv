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
  Ruler, 
  Square, 
  Circle as CircleIcon, 
  Gitlab, 
  Check, 
  X 
} from "lucide-react";

interface MeasurementToolsProps {
  imageRef: React.RefObject<HTMLImageElement>;
  seriesId: number;
  onMeasurementAdded?: (measurement: any) => void;
}

// Measurement schema for form validation
const measurementSchema = z.object({
  type: z.enum(["line", "area", "circumference", "angle"]),
  unit: z.string().min(1, "Unit is required"),
  value: z.string().min(1, "Value is required"),
  notes: z.string().optional(),
  startX: z.number().optional(),
  startY: z.number().optional(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number()
  })).optional(),
  seriesId: z.number()
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  imageRef,
  seriesId,
  onMeasurementAdded
}) => {
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number, y: number } | null>(null);
  const [anglePoints, setAnglePoints] = useState<{ x: number, y: number }[]>([]);
  const [previewMeasurement, setPreviewMeasurement] = useState<any | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Initialize form with default values
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      type: "line",
      unit: "mm",
      value: "",
      notes: "",
      seriesId: seriesId
    }
  });
  
  const { type, unit } = form.watch();
  
  // Update seriesId when prop changes
  useEffect(() => {
    form.setValue('seriesId', seriesId);
  }, [seriesId, form]);
  
  // Mutation for saving measurements
  const createMeasurementMutation = useMutation({
    mutationFn: async (data: MeasurementFormValues) => {
      const response = await apiRequest("POST", `/api/imaging-series/${seriesId}/measurements`, data);
      return response.json();
    },
    onSuccess: (data) => {
      // Reset form and drawing state
      form.reset({
        type: "line",
        unit: "mm",
        value: "",
        notes: "",
        seriesId: seriesId
      });
      setPreviewMeasurement(null);
      setStartPoint(null);
      setEndPoint(null);
      setAnglePoints([]);
      
      // Notify parent component
      if (onMeasurementAdded) {
        onMeasurementAdded(data);
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
  
  // Prepare measurement data for submission
  const prepareMeasurementData = (): MeasurementFormValues => {
    const data = form.getValues();
    
    if (type === "angle" && anglePoints.length === 3) {
      return {
        ...data,
        points: anglePoints
      };
    }
    
    if (startPoint && endPoint) {
      return {
        ...data,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: endPoint.x,
        endY: endPoint.y
      };
    }
    
    return data;
  };
  
  // Calculate measurement value based on type and points
  const calculateMeasurement = (): string => {
    if (!startPoint || !endPoint) return "";
    
    if (type === "line") {
      // Calculate distance
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      return Math.sqrt(dx * dx + dy * dy).toFixed(2);
    }
    
    if (type === "area") {
      // Calculate area
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);
      return (width * height).toFixed(2);
    }
    
    if (type === "circumference") {
      // Calculate radius and circumference
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return (2 * Math.PI * radius).toFixed(2);
    }
    
    return "";
  };
  
  // Calculate angle between three points
  const calculateAngle = (): string => {
    if (anglePoints.length !== 3) return "";
    
    const [p1, p2, p3] = anglePoints;
    
    // Calculate vectors
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;
    
    // Calculate dot product
    const dotProduct = v1x * v2x + v1y * v2y;
    
    // Calculate magnitudes
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    // Calculate angle in degrees
    const angleRad = Math.acos(dotProduct / (mag1 * mag2));
    const angleDeg = (angleRad * 180) / Math.PI;
    
    return angleDeg.toFixed(1);
  };
  
  // Update measurement value on form when points change
  useEffect(() => {
    let value = "";
    
    if (type === "angle") {
      value = calculateAngle();
    } else if (startPoint && endPoint) {
      value = calculateMeasurement();
    }
    
    if (value) {
      form.setValue("value", value);
    }
  }, [startPoint, endPoint, anglePoints, type, form]);
  
  // Handle form submission
  const onSubmit = () => {
    const data = prepareMeasurementData();
    
    // Validate that we have the necessary data based on type
    if (type === "angle") {
      if (anglePoints.length < 3) {
        form.setError("type", { message: "Please place 3 points to form an angle" });
        return;
      }
    } else {
      if (!startPoint || !endPoint) {
        form.setError("type", { message: "Please complete the measurement" });
        return;
      }
    }
    
    createMeasurementMutation.mutate(data);
  };
  
  // Cancel current measurement
  const handleCancel = () => {
    setPreviewMeasurement(null);
    setStartPoint(null);
    setEndPoint(null);
    setAnglePoints([]);
    setIsMeasuring(false);
  };
  
  // Mouse down handler for starting measurement
  const handleMouseDown = (event: React.MouseEvent) => {
    const position = getCursorPosition(event);
    if (!position) return;
    
    if (type === "angle") {
      // Add point for angle measurement
      if (anglePoints.length < 3) {
        setAnglePoints(prev => [...prev, position]);
        
        if (anglePoints.length === 0) {
          setStartPoint(position);
        } else if (anglePoints.length === 1) {
          setEndPoint(position);
        }
        
        // Only start preview after 2 points
        if (anglePoints.length === 1) {
          setPreviewMeasurement({
            type,
            points: [...anglePoints, position]
          });
        } else if (anglePoints.length === 2) {
          setPreviewMeasurement({
            type,
            points: [...anglePoints, position]
          });
        }
      }
      return;
    }
    
    // For other measurement types
    if (!isMeasuring) {
      // Start measurement
      setIsMeasuring(true);
      setStartPoint(position);
      setEndPoint(position);
      setPreviewMeasurement({
        type,
        startX: position.x,
        startY: position.y,
        endX: position.x,
        endY: position.y
      });
    }
  };
  
  // Mouse move handler for drawing
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isMeasuring || !startPoint) return;
    
    const currentPosition = getCursorPosition(event);
    if (!currentPosition) return;
    
    // Update end point for measurement
    setEndPoint(currentPosition);
    setPreviewMeasurement({
      type,
      startX: startPoint.x,
      startY: startPoint.y,
      endX: currentPosition.x,
      endY: currentPosition.y
    });
  };
  
  // Mouse up handler for finishing drawing
  const handleMouseUp = (event: React.MouseEvent) => {
    if (!isMeasuring) return;
    
    const currentPosition = getCursorPosition(event);
    if (!currentPosition || !startPoint) return;
    
    // Finalize end point
    setEndPoint(currentPosition);
    setPreviewMeasurement({
      type,
      startX: startPoint.x,
      startY: startPoint.y,
      endX: currentPosition.x,
      endY: currentPosition.y
    });
    
    setIsMeasuring(false);
  };
  
  // Render preview of current measurement
  const renderPreview = () => {
    if (type === "angle" && anglePoints.length > 1) {
      return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <svg className="absolute top-0 left-0 w-full h-full">
            {anglePoints.length >= 2 && (
              <line
                x1={`${anglePoints[0].x}%`}
                y1={`${anglePoints[0].y}%`}
                x2={`${anglePoints[1].x}%`}
                y2={`${anglePoints[1].y}%`}
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="2"
              />
            )}
            {anglePoints.length >= 3 && (
              <line
                x1={`${anglePoints[1].x}%`}
                y1={`${anglePoints[1].y}%`}
                x2={`${anglePoints[2].x}%`}
                y2={`${anglePoints[2].y}%`}
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="2"
              />
            )}
            {anglePoints.map((point, index) => (
              <circle
                key={index}
                cx={`${point.x}%`}
                cy={`${point.y}%`}
                r="3"
                fill={index === 1 ? "rgba(59, 130, 246, 0.8)" : "rgba(59, 130, 246, 0.5)"}
              />
            ))}
            {anglePoints.length === 3 && (
              <text
                x={`${anglePoints[1].x + 2}%`}
                y={`${anglePoints[1].y - 2}%`}
                className="text-xs"
                fill="rgba(59, 130, 246, 1)"
              >
                {calculateAngle()}°
              </text>
            )}
          </svg>
        </div>
      );
    }
    
    if (!previewMeasurement || !startPoint || !endPoint) return null;
    
    if (previewMeasurement.type === "line") {
      return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <svg className="absolute top-0 left-0 w-full h-full">
            <line
              x1={`${startPoint.x}%`}
              y1={`${startPoint.y}%`}
              x2={`${endPoint.x}%`}
              y2={`${endPoint.y}%`}
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
            />
          </svg>
          <span
            className="absolute bg-blue-500 text-white text-xs px-1 py-0.5 rounded"
            style={{
              left: `${(startPoint.x + endPoint.x) / 2}%`,
              top: `${(startPoint.y + endPoint.y) / 2 - 2}%`,
            }}
          >
            {calculateMeasurement()} {typeof unit === "string" ? unit : ""}
          </span>
        </div>
      );
    }
    
    if (previewMeasurement.type === "area") {
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);
      const x = Math.min(startPoint.x, endPoint.x);
      const y = Math.min(startPoint.y, endPoint.y);
      
      return (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            pointerEvents: 'none'
          }}
        >
          <span className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
            {calculateMeasurement()} {typeof unit === "string" ? unit : ""}²
          </span>
        </div>
      );
    }
    
    if (previewMeasurement.type === "circumference") {
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      return (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-full"
          style={{
            left: `${startPoint.x - radius}%`,
            top: `${startPoint.y - radius}%`,
            width: `${radius * 2}%`,
            height: `${radius * 2}%`,
            pointerEvents: 'none'
          }}
        >
          <span className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
            {calculateMeasurement()} {typeof unit === "string" ? unit : ""}
          </span>
        </div>
      );
    }
    
    return null;
  };
  
  // Instruction text based on current measurement type
  const getInstructionText = () => {
    switch (type) {
      case "line":
        return "Click and drag to measure distance";
      case "area":
        return "Click and drag to measure area";
      case "circumference":
        return "Click at center point, then drag to set radius";
      case "angle":
        return `Click to place ${anglePoints.length === 0 ? "first" : anglePoints.length === 1 ? "second" : "third"} point (${anglePoints.length}/3 points)`;
      default:
        return "Select a measurement type";
    }
  };
  
  // Get available units based on measurement type
  const getAvailableUnits = () => {
    switch (type) {
      case "line":
      case "circumference":
        return [
          { value: "mm", label: "Millimeters (mm)" },
          { value: "cm", label: "Centimeters (cm)" },
          { value: "in", label: "Inches (in)" },
          { value: "px", label: "Pixels (px)" },
        ];
      case "area":
        return [
          { value: "mm", label: "Square Millimeters (mm²)" },
          { value: "cm", label: "Square Centimeters (cm²)" },
          { value: "in", label: "Square Inches (in²)" },
          { value: "px", label: "Square Pixels (px²)" },
        ];
      case "angle":
        return [
          { value: "deg", label: "Degrees (°)" },
        ];
      default:
        return [{ value: "mm", label: "Millimeters (mm)" }];
    }
  };
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Measurement Tools</h3>
      
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measurement Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleCancel(); // Reset when changing type
                    
                    // Set appropriate unit based on type
                    if (value === "angle") {
                      form.setValue("unit", "deg");
                    } else {
                      form.setValue("unit", "mm");
                    }
                  }}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a measurement type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="line">
                      <div className="flex items-center">
                        <Ruler className="h-4 w-4 mr-2" />
                        <span>Line (Distance)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="area">
                      <div className="flex items-center">
                        <Square className="h-4 w-4 mr-2" />
                        <span>Area</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="circumference">
                      <div className="flex items-center">
                        <CircleIcon className="h-4 w-4 mr-2" />
                        <span>Circumference</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="angle">
                      <div className="flex items-center">
                        <Gitlab className="h-4 w-4 mr-2" />
                        <span>Angle</span>
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
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getAvailableUnits().map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Measurement value" 
                    {...field}
                    disabled={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Optional notes about this measurement" 
                    {...field}
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
              {!previewMeasurement && anglePoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">Measurement preview area</p>
              ) : (
                renderPreview()
              )}
            </div>
          </div>
          
          {(previewMeasurement || anglePoints.length > 0) && (
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
                disabled={
                  createMeasurementMutation.isPending || 
                  (type === "angle" && anglePoints.length < 3) ||
                  (type !== "angle" && (!startPoint || !endPoint))
                }
              >
                <Check className="h-4 w-4 mr-2" /> Save Measurement
              </Button>
            </div>
          )}
        </div>
      </Form>
    </div>
  );
};

export default MeasurementTools;