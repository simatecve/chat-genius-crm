import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, FileText, Image as ImageIcon, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AttachmentRendererProps {
  attachmentUrl: string;
  messageType?: string;
  isOutgoing: boolean;
}

const AttachmentRenderer: React.FC<AttachmentRendererProps> = ({
  attachmentUrl,
  messageType,
  isOutgoing
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Detectar tipo de archivo por extensión
  const getFileType = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) return 'image';
    if (url.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video';
    if (url.match(/\.(mp3|wav|ogg|oga|m4a|aac)$/i)) return 'audio';
    if (url.match(/\.(pdf)$/i)) return 'pdf';
    if (url.match(/\.(doc|docx)$/i)) return 'document';
    if (url.match(/\.(txt)$/i)) return 'text';
    return 'file';
  };

  const fileType = getFileType(attachmentUrl);
  const fileName = attachmentUrl.split('/').pop() || 'archivo';

  // Funciones para audio
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = attachmentUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Renderizado según tipo de archivo
  switch (fileType) {
    case 'image':
      return (
        <div className="mb-2">
          <img 
            src={attachmentUrl} 
            alt="Imagen adjunta"
            className="max-w-xs max-h-64 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachmentUrl, '_blank')}
            loading="lazy"
          />
        </div>
      );

    case 'video':
      return (
        <div className="mb-2">
          <video 
            src={attachmentUrl} 
            controls 
            className="max-w-xs max-h-64 rounded-md"
            preload="metadata"
          />
        </div>
      );

    case 'audio':
      return (
        <div className="mb-2">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg min-w-[250px]",
            isOutgoing 
              ? "bg-primary/10" 
              : "bg-background/50"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 w-10 rounded-full p-0",
                isOutgoing 
                  ? "hover:bg-primary-foreground/20" 
                  : "hover:bg-muted/50"
              )}
              onClick={togglePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Music className="h-4 w-4 opacity-70" />
                <span className="text-sm font-medium truncate">
                  Audio
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div 
                  className="flex-1 h-1 bg-muted rounded-full cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ 
                      width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
                    }}
                  />
                </div>
                <span className="text-xs opacity-70 min-w-[35px]">
                  {duration > 0 ? formatTime(currentTime) : '0:00'}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={downloadFile}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>

          <audio
            ref={audioRef}
            src={attachmentUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />
        </div>
      );

    case 'pdf':
      return (
        <div className="mb-2">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity",
            isOutgoing 
              ? "bg-primary/10" 
              : "bg-background/50"
          )}
          onClick={() => window.open(attachmentUrl, '_blank')}
          >
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs opacity-70">Documento PDF</p>
            </div>
            <Download className="h-4 w-4 opacity-70" />
          </div>
        </div>
      );

    case 'document':
      return (
        <div className="mb-2">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity",
            isOutgoing 
              ? "bg-primary/10" 
              : "bg-background/50"
          )}
          onClick={() => window.open(attachmentUrl, '_blank')}
          >
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs opacity-70">Documento</p>
            </div>
            <Download className="h-4 w-4 opacity-70" />
          </div>
        </div>
      );

    default:
      return (
        <div className="mb-2">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity",
            isOutgoing 
              ? "bg-primary/10" 
              : "bg-background/50"
          )}
          onClick={downloadFile}
          >
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs opacity-70">Archivo adjunto</p>
            </div>
            <Download className="h-4 w-4 opacity-70" />
          </div>
        </div>
      );
  }
};

export default AttachmentRenderer;