import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SignaturePadRef {
  clear: () => void;
  getSignatureData: () => string | null;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  title?: string;
  width?: number;
  height?: number;
  className?: string;
  onSave?: (signatureData: string) => void;
  defaultValue?: string;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ title = "Signature", width = 500, height = 200, className, onSave, defaultValue }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    useImperativeHandle(ref, () => ({
      clear: () => {
        if (sigCanvas.current) {
          sigCanvas.current.clear();
          setIsEmpty(true);
        }
      },
      getSignatureData: () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
          return sigCanvas.current.toDataURL("image/png");
        }
        return null;
      },
      isEmpty: () => {
        return isEmpty;
      }
    }));

    useEffect(() => {
      // Load default signature if provided
      if (defaultValue && sigCanvas.current) {
        const img = new Image();
        img.onload = () => {
          const ctx = sigCanvas.current?.getCanvas().getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            setIsEmpty(false);
          }
        };
        img.src = defaultValue;
      }
    }, [defaultValue]);

    const handleClear = () => {
      if (sigCanvas.current) {
        sigCanvas.current.clear();
        setIsEmpty(true);
      }
    };

    const handleSave = () => {
      if (sigCanvas.current && !sigCanvas.current.isEmpty() && onSave) {
        const signatureData = sigCanvas.current.toDataURL("image/png");
        onSave(signatureData);
      }
    };

    const handleBegin = () => {
      setIsEmpty(false);
    };

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div 
              className="border rounded-md mb-2 bg-white" 
              style={{ width: width, height: height }}
            >
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  width: width,
                  height: height,
                  className: "signature-canvas"
                }}
                onBegin={handleBegin}
              />
            </div>
            <Label className="text-sm text-muted-foreground mt-1">
              Please sign above
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isEmpty}
          >
            Save Signature
          </Button>
        </CardFooter>
      </Card>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export { SignaturePad };