
import React, { useState, useCallback } from 'react';
import { PromptForm } from './components/PromptForm';
import { MusicDisplay } from './components/MusicDisplay';
import { generateMusic } from './services/geminiService'; // Updated import
import type { GeneratedMusic } from './types';

const MusicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
  </svg>
);

export default function App() {
  const [prompt, setPrompt] = useState<string>('Epic cinematic score for a space battle, orchestral with intense drums');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedMusic, setGeneratedMusic] = useState<GeneratedMusic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedMusic(null);

    try {
      const result = await generateMusic(prompt); // Call updated function
      setGeneratedMusic(result);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate music. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
            AI Instrumentalist
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Describe the music you want to hear, and let AI compose it for you.
          </p>
        </header>

        <main className="flex flex-col gap-8">
          <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700">
            <PromptForm 
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleGenerate}
              isLoading={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">
              <p>{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center items-center flex-col gap-4 p-8 text-gray-400">
                <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              <p>Composing your masterpiece...</p>
            </div>
          )}

          {generatedMusic && !isLoading && (
             <MusicDisplay musicData={generatedMusic} />
          )}

          {!generatedMusic && !isLoading && !error && (
            <div className="text-center p-8 border-2 border-dashed border-gray-700 rounded-2xl text-gray-500">
              <div className="flex justify-center mb-4">
                <MusicIcon />
              </div>
              <h2 className="text-xl font-semibold">Your composition will appear here</h2>
              <p>Enter a prompt above and click "Generate" to start.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
