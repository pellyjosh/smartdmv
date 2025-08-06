import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Eye, File as FileIcon, Image as ImageIcon, FileText, Trash2, AlertCircle, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedFile } from "./file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileAttachmentListProps {
  files: UploadedFile[];
  onDelete?: (fileId: number) => void;
  className?: string;
  recordType: string;
  recordId: number;
  isLoading?: boolean;
  canDelete?: boolean;
}

export function FileAttachmentList({
  files,
  onDelete,
  className,
  recordType,
  recordId,
  isLoading = false,
  canDelete = true
}: FileAttachmentListProps) {
  const { toast } = useToast();
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/medical-record-attachments/delete/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medical-record-attachments/${recordType}/${recordId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/soap-notes/${recordId}`] });
      toast({
        title: "Attachment deleted",
        description: "The attachment has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting attachment",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = (fileId: number) => {
    setFileToDelete(fileId);
  };
  
  const confirmDelete = () => {
    if (fileToDelete !== null) {
      if (onDelete) {
        onDelete(fileToDelete);
      } else {
        deleteMutation.mutate(fileToDelete);
      }
      setFileToDelete(null);
    }
  };
  
  const getFileIcon = (file: UploadedFile) => {
    if (file.fileType.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    } else if (file.fileType === "application/pdf") {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };
  
  const getFilePreview = (file: UploadedFile) => {
    const fileUrl = `/api/medical-record-attachments/file/${file.id}`;
    
    if (file.fileType.startsWith("image/")) {
      return (
        <div className="flex justify-center">
          <img 
            src={fileUrl} 
            alt={file.fileName} 
            className="max-h-[70vh] max-w-full rounded-md object-contain"
          />
        </div>
      );
    } else if (file.fileType === "application/pdf") {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[70vh] rounded-md"
          title={file.fileName}
        />
      );
    } else {
      return (
        <div className="p-12 text-center">
          <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p>This file type cannot be previewed directly.</p>
          <Button 
            className="mt-4"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <Download className="mr-2 h-4 w-4" /> Download File
          </Button>
        </div>
      );
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-12 bg-muted rounded-md"></div>
        <div className="h-12 bg-muted rounded-md"></div>
      </div>
    );
  }
  
  if (files.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No attachments found</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {files.map((file) => (
        <div 
          key={file.id} 
          className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {getFileIcon(file)}
            <div>
              <p className="font-medium truncate max-w-[200px]">{file.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewFile(file)}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(`/api/medical-record-attachments/file/${file.id}`, '_blank')}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(file.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      
      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.fileName}</DialogTitle>
            <DialogDescription>
              {previewFile ? `${(previewFile.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {previewFile && getFilePreview(previewFile)}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={fileToDelete !== null} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file attachment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}