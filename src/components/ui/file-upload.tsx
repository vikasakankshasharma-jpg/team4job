
"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function FileUpload({ onFilesChange, maxFiles = 5 }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles, ...acceptedFiles].slice(0, maxFiles);
      onFilesChange(newFiles);
      return newFiles;
    });
  }, [onFilesChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const removeFile = (fileToRemove: File) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter(file => file !== fileToRemove);
      onFilesChange(newFiles);
      return newFiles;
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-8 h-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-center text-muted-foreground">
          {isDragActive
            ? 'Drop the files here ...'
            : "Drag 'n' drop some files here, or click to select files"}
        </p>
        <p className="text-xs text-muted-foreground">(Images, Videos, or Documents)</p>
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-sm">Selected Files ({files.length}/{maxFiles}):</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-secondary/50">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(file)} className="h-6 w-6 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
