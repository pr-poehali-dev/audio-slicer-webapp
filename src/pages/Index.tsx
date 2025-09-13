import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import JSZip from 'jszip';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'upload', 'result'
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fps, setFps] = useState('8');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const processingPhrases = [
    '🎵 Извлекаю аудио из видео...',
    '✂️ Нарезаю на кусочки...',
    '🖼️ Вытаскиваю кадры для обложек...',
    '🎨 Создаю обложки для треков...',
    '📦 Упаковываю всё в ZIP...',
    '🚀 Почти готово!'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.includes('video')) {
      setSelectedFile(file);
      // Get video duration
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        setVideoDuration(Math.floor(video.duration));
        URL.revokeObjectURL(video.src);
      };
    }
  };

  // Calculate total chunks when FPS or video duration changes
  useEffect(() => {
    if (videoDuration && fps) {
      const chunks = videoDuration * parseInt(fps);
      setTotalChunks(chunks);
    }
  }, [videoDuration, fps]);

  const extractFrameAtTime = (video: HTMLVideoElement, time: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      video.currentTime = time;
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.8);
      };
    });
  };

  const extractAudioSegment = async (audioBuffer: AudioBuffer, startTime: number, duration: number): Promise<Blob> => {
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);
    const segmentLength = endSample - startSample;
    
    const audioContext = new AudioContext();
    const segmentBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      segmentLength,
      sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const segmentData = segmentBuffer.getChannelData(channel);
      for (let i = 0; i < segmentLength; i++) {
        segmentData[i] = channelData[startSample + i] || 0;
      }
    }
    
    // Convert to WAV
    const wav = encodeWAV(segmentBuffer);
    return new Blob([wav], { type: 'audio/wav' });
  };

  const encodeWAV = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  const handleStartProcessing = async () => {
    if (!selectedFile || !fps || !videoDuration) return;
    
    setIsProcessing(true);
    setProgress(0);
    setCurrentPhrase(0);
    
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(selectedFile);
      await new Promise(resolve => video.onloadeddata = resolve);
      
      // Extract audio
      setCurrentPhrase(0);
      setProgress(10);
      
      const audioContext = new AudioContext();
      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      setCurrentPhrase(1);
      setProgress(20);
      
      const zip = new JSZip();
      const fpsNum = parseInt(fps);
      const chunkDuration = 1 / fpsNum; // Duration of each chunk in seconds
      
      for (let second = 0; second < videoDuration; second++) {
        for (let chunk = 0; chunk < fpsNum; chunk++) {
          const currentTime = second + (chunk * chunkDuration);
          const chunkIndex = second * fpsNum + chunk;
          
          // Extract frame for cover
          setCurrentPhrase(2);
          const frameBlob = await extractFrameAtTime(video, currentTime);
          
          // Extract audio segment
          setCurrentPhrase(1);
          const audioBlob = await extractAudioSegment(audioBuffer, currentTime, chunkDuration);
          
          // Add to ZIP
          setCurrentPhrase(4);
          const paddedIndex = String(chunkIndex + 1).padStart(3, '0');
          zip.file(`audio_${paddedIndex}.wav`, audioBlob);
          zip.file(`cover_${paddedIndex}.jpg`, frameBlob);
          
          // Update progress
          const progressPercent = Math.floor(((chunkIndex + 1) / totalChunks) * 80) + 20;
          setProgress(progressPercent);
        }
      }
      
      // Generate ZIP
      setCurrentPhrase(4);
      setProgress(95);
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      setDownloadUrl(url);
      
      setCurrentPhrase(5);
      setProgress(100);
      
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentScreen('result');
      }, 500);
      
    } catch (error) {
      console.error('Error processing video:', error);
      setIsProcessing(false);
      alert('Ошибка при обработке видео. Попробуйте другой файл.');
    } finally {
      URL.revokeObjectURL(video.src);
    }
  };

  const handleDownloadZip = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video_sliced_${fps}fps.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    let phraseInterval: NodeJS.Timeout;
    
    if (isProcessing) {
      phraseInterval = setInterval(() => {
        setCurrentPhrase(prev => (prev + 1) % processingPhrases.length);
      }, 2000);
    }
    
    return () => {
      if (phraseInterval) clearInterval(phraseInterval);
    };
  }, [isProcessing, processingPhrases.length]);

  return (
    <div className="min-h-screen bg-dark relative overflow-hidden">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
        <div className="blob blob-5"></div>
        <div className="blob blob-6"></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          
          {/* Home Screen */}
          {currentScreen === 'home' && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  Video Slicer
                </h1>
                <p className="text-lg text-white/80">
                  Нарежь видео на аудио-кусочки с обложками
                </p>
              </div>
              
              <Button 
                onClick={() => setCurrentScreen('upload')}
                className="glass-button text-white text-lg px-8 py-4 h-auto relative overflow-hidden group hover:scale-[1.05] transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Начать нарезку 🪽
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-20 group-hover:opacity-30 transition-opacity"></div>
              </Button>
            </div>
          )}

          {/* Upload Screen */}
          {currentScreen === 'upload' && (
            <div className="space-y-6 animate-fade-in">
              <Button 
                onClick={() => setCurrentScreen('home')}
                variant="ghost"
                className="text-white/80 hover:text-white p-2"
              >
                <Icon name="ArrowLeft" size={20} />
              </Button>
              
              {/* File Upload Area */}
              <div className="glass-card p-12 border-2 border-dashed border-white/20 hover:border-white/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer relative group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="Upload" size={32} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white mb-1">
                      {selectedFile ? selectedFile.name : 'Загрузите видео'}
                    </p>
                    <p className="text-white/60 text-sm">
                      Поддерживаются MP4, MOV, AVI
                    </p>
                    {videoDuration > 0 && (
                      <p className="text-cyan-400 text-sm mt-2">
                        Длительность: {videoDuration} сек
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* FPS Input */}
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">
                  FPS (кадров в секунду)
                </label>
                <Input
                  type="number"
                  value={fps}
                  onChange={(e) => setFps(e.target.value)}
                  className="bg-black/60 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                  placeholder="8"
                  min="1"
                  max="60"
                />
                {totalChunks > 0 && (
                  <p className="text-purple-400 text-sm">
                    Будет создано: {totalChunks} аудио-файлов
                  </p>
                )}
              </div>

              {/* Start Button or Progress */}
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="glass-card p-6 space-y-4">
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-white/80 text-center transition-all duration-500 animate-fade-in">
                      {processingPhrases[currentPhrase]}
                    </p>
                    <p className="text-white/60 text-sm text-center">
                      {progress}%
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleStartProcessing}
                  disabled={!selectedFile || !fps || !videoDuration}
                  className="w-full glass-button text-white py-4 h-auto relative overflow-hidden group wave-button hover:scale-[1.02] transition-all duration-300"
                >
                  <span className="relative z-10">
                    Начать!
                  </span>
                  <div className="wave-animation"></div>
                </Button>
              )}
            </div>
          )}

          {/* Result Screen */}
          {currentScreen === 'result' && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="glass-card p-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 flex items-center justify-center">
                  <Icon name="Check" size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Файл готов!
                </h2>
                <p className="text-white/80">
                  Ваше видео ({videoDuration} сек) нарезано на {totalChunks} аудио-файлов с обложками при {fps} FPS
                </p>
              </div>

              <Button
                onClick={handleDownloadZip}
                className="glass-button text-white px-8 py-4 h-auto relative overflow-hidden group hover:scale-[1.05] transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon name="Download" size={20} />
                  Скачать ZIP ({totalChunks} файлов)
                </span>
              </Button>

              <Button
                onClick={() => {
                  setCurrentScreen('home');
                  setSelectedFile(null);
                  setFps('8');
                  setVideoDuration(0);
                  setTotalChunks(0);
                  if (downloadUrl) {
                    URL.revokeObjectURL(downloadUrl);
                    setDownloadUrl(null);
                  }
                }}
                variant="ghost"
                className="text-white/80 hover:text-white hover:scale-[1.05] transition-all duration-300"
              >
                Создать ещё один
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;