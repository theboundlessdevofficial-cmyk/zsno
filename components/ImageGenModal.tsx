
import React, { useState } from 'react';
import { AspectRatio, ImageSize } from '../types';
import { generateImage } from '../services/geminiService';

interface ImageGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (url: string) => void;
}

const ImageGenModal: React.FC<ImageGenModalProps> = ({ isOpen, onClose, onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Check for API key presence in AI Studio context
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Proceeding after openSelectKey per instructions
      }
    }

    setLoading(true);
    setError(null);
    try {
      const url = await generateImage(prompt, aspectRatio, imageSize);
      onImageGenerated(url);
      onClose();
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key Error. Please re-select your key.");
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        setError("Failed to generate image. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
            Azo Image Studio
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Prompt</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none"
              placeholder="A futuristic cybernetic city at sunset..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              >
                {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(ratio => (
                  <option key={ratio} value={ratio}>{ratio}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Resolution</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
              >
                {['1K', '2K', '4K'].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button 
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Requires paid API key. Visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">billing docs</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenModal;
