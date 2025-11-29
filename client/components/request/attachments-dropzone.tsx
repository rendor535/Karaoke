'use client';
import {
  Dropzone,
  DropZoneArea, DropzoneDescription,
  DropzoneFileList,
  DropzoneFileListItem,
  DropzoneMessage,
  DropzoneRemoveFile,
  DropzoneTrigger,
  useDropzone,
} from '@/components/ui/dropzone';
import { CloudUploadIcon, Trash2Icon } from 'lucide-react';
import { useRef } from 'react';

export function AttachmentsDropzone({ onFilesChange, title }: { onFilesChange?: (files: File[]) => void; title?: string }) {
  const dropzoneRef = useRef<File[]>([]);

  const dropzone = useDropzone({
    onDropFile: async (file: File) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updated = [...dropzoneRef.current, file];
      dropzoneRef.current = updated;
      onFilesChange?.(updated);
      return {
        status: "success",
        result: URL.createObjectURL(file),
      };
    },
    onRemoveFile: (fileId: string) => {
      // Find and remove file from our ref when file is removed via UI
      const fileIndex = dropzone.fileStatuses.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        dropzoneRef.current = dropzoneRef.current.filter((_, index) => index !== fileIndex);
        onFilesChange?.(dropzoneRef.current);
      }
    },
    validation: {
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg'],
        'application/pdf': ['.pdf'],
      },
      maxSize: 5 * 1024 * 1024,
    },
  });

  return (
    <div className="not-prose flex flex-col gap-4">
      <Dropzone {...dropzone}>
        <div>
          <div className="flex justify-between">
            <DropzoneDescription>{title}</DropzoneDescription>
            <DropzoneMessage/>
          </div>
          <DropZoneArea>
            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
              <CloudUploadIcon className="size-8"/>
              <div>
                <p className="font-semibold">Prześlij pliki</p>
                <p className="text-sm text-muted-foreground">
                  Przeciągnij i upuść pliki tutaj lub kliknij, aby wybrać
                  pliki.
                </p>
              </div>
            </DropzoneTrigger>
          </DropZoneArea>
        </div>

        <DropzoneFileList className="grid grid-cols-3 gap-3 p-0">
          {dropzone.fileStatuses.map((file) => (
            <DropzoneFileListItem
              className="overflow-hidden rounded-md bg-secondary p-0 shadow-sm"
              key={file.id}
              file={file}
            >
              {file.status === 'pending' && (
                <div className="aspect-video animate-pulse bg-black/20"/>
              )}
              {file.status === 'success' && (
                <>
                  {file.file.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.result}
                      alt={file.file.name}
                      className="aspect-video object-cover"
                    />
                  ) : (
                    <div className="aspect-video flex items-center justify-center bg-muted text-muted-foreground">
                      <span className="text-sm font-medium">{file.file.name.split('.').pop()?.toUpperCase()}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between p-2 pl-4">
                <div className="min-w-0">
                  <p className="truncate text-sm">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <DropzoneRemoveFile
                  variant="ghost"
                  className="shrink-0 hover:outline"
                >
                  <Trash2Icon className="size-4"/>
                </DropzoneRemoveFile>
              </div>
            </DropzoneFileListItem>
          ))}
        </DropzoneFileList>
      </Dropzone>
    </div>
  );
}