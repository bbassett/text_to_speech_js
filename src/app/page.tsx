'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [voice, setVoice] = useState('en-US-Wavenet-D');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<{title: string; originalLength: number; truncated: boolean} | null>(null);
  const [longAudioProgress, setLongAudioProgress] = useState<{
    isProcessing: boolean;
    progress: number;
    operationName?: string;
    fileName?: string;
  }>({ isProcessing: false, progress: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (urlDebounceRef.current) {
        clearTimeout(urlDebounceRef.current);
      }
    };
  }, []);

  // Auto-extract text when URL changes with debounce
  useEffect(() => {
    if (urlDebounceRef.current) {
      clearTimeout(urlDebounceRef.current);
    }

    if (url.trim() && !text.trim()) {
      urlDebounceRef.current = setTimeout(() => {
        handleExtractFromUrl();
      }, 200);
    }

    return () => {
      if (urlDebounceRef.current) {
        clearTimeout(urlDebounceRef.current);
      }
    };
  }, [url]);

  const handleExtractFromUrl = async () => {
    if (!url.trim()) return;
    
    setIsExtractingText(true);
    setError(null);
    setExtractedInfo(null);
    
    try {
      const response = await fetch('/api/url-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text from URL');
      }

      const data = await response.json();
      setText(data.text);
      setExtractedInfo({
        title: data.title,
        originalLength: data.originalLength,
        truncated: data.truncated
      });
    } catch (error) {
      console.error('Error extracting text:', error);
      setError(error instanceof Error ? error.message : 'Failed to extract text from URL');
    } finally {
      setIsExtractingText(false);
    }
  };

  const pollLongAudioStatus = async (operationName: string, fileName: string) => {
    try {
      const response = await fetch('/api/tts-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operationName }),
      });

      if (!response.ok) {
        throw new Error('Failed to check operation status');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Download the audio file
        await downloadLongAudio(fileName);
        
        setLongAudioProgress({ isProcessing: false, progress: 100 });
      } else if (data.status === 'error') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setLongAudioProgress({ isProcessing: false, progress: 0 });
        setError(data.error || 'Long audio synthesis failed');
      } else if (data.status === 'processing') {
        setLongAudioProgress(prev => ({ 
          ...prev, 
          progress: data.progress || prev.progress 
        }));
      }
    } catch (error) {
      console.error('Error polling status:', error);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setLongAudioProgress({ isProcessing: false, progress: 0 });
      setError('Failed to check audio generation status');
    }
  };

  const downloadLongAudio = async (fileName: string) => {
    try {
      const response = await fetch('/api/download-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      });

      if (!response.ok) {
        throw new Error('Failed to download audio');
      }

      const blob = await response.blob();
      const audioObjectUrl = URL.createObjectURL(blob);
      setAudioUrl(audioObjectUrl);
    } catch (error) {
      console.error('Error downloading audio:', error);
      setError('Failed to download generated audio');
    }
  };

  const handleTextToSpeech = async () => {
    let textToConvert = text;
    
    // If URL is provided but text is empty, extract text first
    if (url.trim() && !text.trim()) {
      await handleExtractFromUrl();
      return; // Let the user review the extracted text before converting
    }
    
    if (!textToConvert.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setAudioUrl(null); // Clear previous audio
    setLongAudioProgress({ isProcessing: false, progress: 0 });
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToConvert, voice }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Long audio response with operation details
        const data = await response.json();
        
        if (data.isLongAudio) {
          setLongAudioProgress({
            isProcessing: true,
            progress: 0,
            operationName: data.operationName,
            fileName: data.outputFileName,
          });

          // Start polling for completion
          pollingIntervalRef.current = setInterval(() => {
            pollLongAudioStatus(data.operationName, data.outputFileName);
          }, 3000); // Poll every 3 seconds
        }
      } else {
        // Short audio response with direct audio content
        const blob = await response.blob();
        const audioObjectUrl = URL.createObjectURL(blob);
        setAudioUrl(audioObjectUrl);
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setText('');
    setUrl('');
    setExtractedInfo(null);
    setAudioUrl(null);
    setError(null);
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      // Use appropriate file extension based on the audio type
      const fileName = text.length > 5000 ? 'speech.wav' : 'speech.mp3';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Text to Speech
          </h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-6">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Choose input method below - filling one field will disable the other
                </div>
              </div>
              
              {/* URL Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enter URL to extract and convert text:
                  </label>
                  {url && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    id="url-input"
                    type="url"
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      text.trim() ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={text.trim() !== ''}
                  />
                </div>
              </div>

              <div className="text-center text-gray-400 dark:text-gray-500">
                OR
              </div>

              {/* Text Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enter text directly:
                  </label>
                  {text && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  id="text-input"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    url.trim() ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Type your text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={url.trim() !== ''}
                />
              </div>
            </div>
          </div>

          {/* Extracted content info */}
          {extractedInfo && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                Extracted from: {extractedInfo.title}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Original length: {extractedInfo.originalLength} characters
                {extractedInfo.truncated && ' (truncated to 5000 characters)'}
                {extractedInfo.originalLength > 5000 && 
                  ' - Long texts will use advanced processing'}
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voice:
            </label>
            <select
              id="voice-select"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <optgroup label="English (US) - WaveNet">
                <option value="en-US-Wavenet-A">en-US-Wavenet-A (Male)</option>
                <option value="en-US-Wavenet-B">en-US-Wavenet-B (Male)</option>
                <option value="en-US-Wavenet-C">en-US-Wavenet-C (Female)</option>
                <option value="en-US-Wavenet-D">en-US-Wavenet-D (Male)</option>
                <option value="en-US-Wavenet-E">en-US-Wavenet-E (Female)</option>
                <option value="en-US-Wavenet-F">en-US-Wavenet-F (Female)</option>
              </optgroup>
              <optgroup label="English (US) - Standard">
                <option value="en-US-Standard-A">en-US-Standard-A (Male)</option>
                <option value="en-US-Standard-B">en-US-Standard-B (Male)</option>
                <option value="en-US-Standard-C">en-US-Standard-C (Female)</option>
                <option value="en-US-Standard-D">en-US-Standard-D (Male)</option>
                <option value="en-US-Standard-E">en-US-Standard-E (Female)</option>
              </optgroup>
              <optgroup label="English (UK)">
                <option value="en-GB-Wavenet-A">en-GB-Wavenet-A (Female)</option>
                <option value="en-GB-Wavenet-B">en-GB-Wavenet-B (Male)</option>
                <option value="en-GB-Wavenet-C">en-GB-Wavenet-C (Female)</option>
                <option value="en-GB-Wavenet-D">en-GB-Wavenet-D (Male)</option>
              </optgroup>
            </select>
          </div>
          
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md">
              {error}
            </div>
          )}

          {/* Long Audio Progress */}
          {longAudioProgress.isProcessing && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Processing long audio...
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {longAudioProgress.progress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${longAudioProgress.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                This may take several minutes for long texts. The page will automatically update when ready.
              </p>
            </div>
          )}
          
          <button
            onClick={handleTextToSpeech}
            disabled={(!text.trim() && !url.trim()) || isLoading || isExtractingText || longAudioProgress.isProcessing}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {longAudioProgress.isProcessing ? 'Processing Long Audio...' :
             isLoading ? 'Generating Speech...' : 
             isExtractingText ? 'Extracting Text...' :
             (url.trim() && !text.trim()) ? 'Extract & Convert to Speech' : 
             'Convert to Speech'}
          </button>
          
          {audioUrl && (
            <div className="mt-6">
              <audio
                ref={audioRef}
                controls
                className="w-full"
                src={audioUrl}
              />
              <button
                onClick={downloadAudio}
                className="mt-3 w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Download Audio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
