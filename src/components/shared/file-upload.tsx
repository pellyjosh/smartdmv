import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, X, File as FileIcon, Image as ImageIcon, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type UploadedFile = {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath?: string;
};

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  endpoint: string;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedFileTypes?: string[];
  recordType: string;
  recordId?: number;
  className?: string;
}

export function FileUpload({
  onFilesUploaded,
  endpoint,
  maxFiles = 5,
  maxSizeMB = 10,
  allowedFileTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  recordType,
  recordId,
  className
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadError(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Check if adding these files would exceed maxFiles
      if (files.length > maxFiles) {
        setUploadError(`You can upload a maximum of ${maxFiles} files at once.`);
        return;
      }
      
      // Check file sizes and types
      const invalidFiles = files.filter(file => {
        if (file.size > maxSizeMB * 1024 * 1024) {
          setUploadError(`File ${file.name} exceeds the maximum size of ${maxSizeMB}MB.`);
          return true;
        }
        
        if (!allowedFileTypes.includes(file.type)) {
          setUploadError(`File ${file.name} has an unsupported file type.`);
          return true;
        }
        
        return false;
      });
      
      if (invalidFiles.length > 0) {
        return;
      }
      
      setSelectedFiles(files);
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (fileType === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }
    
    if (!recordId && recordType !== "PENDING") {
      setUploadError("Record ID is required for uploading files.");
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });
      
      formData.append("recordType", recordType);
      if (recordId) {
        formData.append("recordId", recordId.toString());
      }
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = Math.random() * 20;
          const newProgress = prev + increment;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        // No need to set Content-Type header when using FormData
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const uploadedFiles: UploadedFile[] = await response.json();
      
      setUploadProgress(100);
      onFilesUploaded(uploadedFiles);
      clearSelectedFiles();
      
      // Reset progress after showing 100%
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer" 
        onClick={() => fileInputRef.current?.click()}>
        <UploadCloud className="h-10 w-10 mb-2 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-medium">Upload Files</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop or click to select files
        </p>
        <p className="text-xs text-muted-foreground">
          Max {maxFiles} files, up to {maxSizeMB}MB each
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFileTypes.join(",")}
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center space-x-2">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {uploadProgress > 0 && (
            <Progress value={uploadProgress} className="h-2" />
          )}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={clearSelectedFiles}
              disabled={isUploading}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}