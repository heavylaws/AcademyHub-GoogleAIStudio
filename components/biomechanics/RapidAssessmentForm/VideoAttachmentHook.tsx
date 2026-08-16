'use client';

import React, { useRef } from 'react';
import { Film, Video, X, Upload } from 'lucide-react';

export interface AttachedFileInfo {
  name: string;
  size: number;
  type: string;
  storagePath: string;
  localPreviewUrl?: string;
}

export interface VideoAttachmentHookProps {
  attachedFile: AttachedFileInfo | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isDraggingVideo: boolean;
  onDragStateChange: (isDragging: boolean) => void;
}

export default function VideoAttachmentHook({
  attachedFile,
  onFileSelect,
  onFileRemove,
  isDraggingVideo,
  onDragStateChange,
}: VideoAttachmentHookProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-cyan-500" />
          Optional Clip Attachment (Media References)
        </label>
        <span className="text-[10px] text-slate-500 font-mono">Non-blocking metadata hook</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleFileChange}
        className="hidden"
      />

      {attachedFile ? (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <Video className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {attachedFile.name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {(attachedFile.size / (1024 * 1024)).toFixed(1)} MB • {attachedFile.storagePath}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onFileRemove();
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            onDragStateChange(true);
          }}
          onDragLeave={() => onDragStateChange(false)}
          onDrop={(e) => {
            e.preventDefault();
            onDragStateChange(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFileSelect(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
            isDraggingVideo
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Upload className="w-4 h-4 text-cyan-500" />
            <span>Attach Video Clip or Drag & Drop (Optional)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Stores storage reference metadata without blocking form submission
          </p>
        </div>
      )}
    </div>
  );
}
