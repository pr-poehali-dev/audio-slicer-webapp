import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'upload', 'result'
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fps, setFps] = useState('8');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.includes('video')) {
      setSelectedFile(file);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile || !fps) return;
    
    setIsProcessing(true);
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentScreen('result');
    }, 3000);
  };

  const handleDownloadZip = () => {
    // Simulate zip download
    alert('В production версии здесь будет скачивание ZIP файла с нарезанным аудио!');
  };

  return (
    <div className="min-h-screen bg-dark relative overflow-hidden">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
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
                className="glass-button text-white text-lg px-8 py-4 h-auto relative overflow-hidden group"
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
              <div className="glass-card p-8 border-2 border-dashed border-white/20 hover:border-white/40 transition-colors cursor-pointer relative group">
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
                  className="glass-input text-white"
                  placeholder="8"
                  min="1"
                  max="60"
                />
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartProcessing}
                disabled={!selectedFile || !fps || isProcessing}
                className="w-full glass-button text-white py-4 h-auto relative overflow-hidden group wave-button"
              >
                <span className="relative z-10">
                  {isProcessing ? 'Обработка...' : 'Начать!'}
                </span>
                {!isProcessing && (
                  <div className="wave-animation"></div>
                )}
              </Button>
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
                  Ваше видео успешно нарезано на {fps} аудио-файлов с обложками
                </p>
              </div>

              <Button
                onClick={handleDownloadZip}
                className="glass-button text-white px-8 py-4 h-auto relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon name="Download" size={20} />
                  Скачать ZIP
                </span>
              </Button>

              <Button
                onClick={() => {
                  setCurrentScreen('home');
                  setSelectedFile(null);
                  setFps('8');
                }}
                variant="ghost"
                className="text-white/80 hover:text-white"
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