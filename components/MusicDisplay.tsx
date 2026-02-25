import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import type { GeneratedMusic } from '../types';



interface MusicDisplayProps {
  musicData: GeneratedMusic;
}

export const MusicDisplay: React.FC<MusicDisplayProps> = ({ musicData }) => {
  const visualRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [currentStaffWidth, setCurrentStaffWidth] = useState(0);

  // Use useLayoutEffect to calculate initial staff width before paint
  useLayoutEffect(() => {
    const calculateStaffWidth = () => {
      if (visualRef.current) {
        // Leave some padding, e.g., 20px on each side
        setCurrentStaffWidth(visualRef.current.clientWidth - 40);
      }
    };

    calculateStaffWidth();
    window.addEventListener('resize', calculateStaffWidth);
    return () => window.removeEventListener('resize', calculateStaffWidth);
  }, []);

  useEffect(() => {
    console.log('MusicDisplay useEffect triggered.');
    console.log('ABCJS available:', typeof (window as any).ABCJS !== 'undefined');
    console.log('musicData.abcNotation:', musicData.abcNotation ? 'present' : 'missing');
    console.log('visualRef.current:', visualRef.current ? 'present' : 'missing');
    console.log('audioRef.current:', audioRef.current ? 'present' : 'missing');

    if (typeof (window as any).ABCJS === 'undefined' || !musicData.abcNotation || !visualRef.current || !audioRef.current) {
      // ABCJS not loaded yet, or essential refs/data are missing
      return;
    }

    // Clear previous renders and errors
    visualRef.current.innerHTML = '';
    audioRef.current.innerHTML = '';
    setRenderError(null);

    const abcOptions = {
      responsive: "resize",
      staffwidth: currentStaffWidth,
    };

    try {
      // 1. Render the visual sheet music first
      const visualObjs = (window as any).ABCJS.renderAbc(visualRef.current, musicData.abcNotation, abcOptions);
      if (!visualObjs || visualObjs.length === 0) {
        const errorMessage = "Failed to render sheet music visually. This usually means the generated ABC notation is invalid or incomplete.";
        console.error(errorMessage, "Raw ABC Notation:", musicData.abcNotation);
        setRenderError(errorMessage);
        return;
      }

      // 2. Initialize and prime the audio player using the rendered visual object
      const midiBuffer = new (window as any).ABCJS.synth.CreateSynth();
      const audioContext = new AudioContext(); // Create a new AudioContext for each playback

      midiBuffer.init({
        visualObj: visualObjs[0],
        audioContext: audioContext,
        // millisecondsPerMeasure will be calculated by abcjs based on tempo in ABC notation
      })
      .then(() => {
        return midiBuffer.prime();
      })
      .then(() => {
        // 3. Render the MIDI controls once priming is successful
        // (window as any).ABCJS.renderMidi will handle tempo if Q: is present in abcNotation
        (window as any).ABCJS.renderMidi(audioRef.current, musicData.abcNotation, { generateDownload: false }); // Set generateDownload to false
      })
      .catch((err: any) => {
        const errorMessage = `Could not prepare audio for playback. This can happen if the ABC notation is malformed or if the browser blocks audio. Error: ${err.message || String(err)}`;
        console.error("Error with audio playback setup:", err, "Raw ABC Notation:", musicData.abcNotation);
        setRenderError(errorMessage);
        // Clean up AudioContext if it was created
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      });

    } catch (error: any) {
      const errorMessage = `The generated music notation could not be displayed. Error: ${error.message || String(error)}`;
      console.error("Error rendering ABCJS notation or initializing MIDI:", error, "Raw ABC Notation:", musicData.abcNotation);
      setRenderError(errorMessage);
    }
  }, [musicData.abcNotation, currentStaffWidth]); // Depend on currentStaffWidth to re-render on resize

  const handleDownloadMidi = async () => {
    if (!musicData.abcNotation) {
      alert('No music to export.');
      return;
    }

    if (typeof (window as any).ABCJS === 'undefined') {
      alert('ABCJS library is not loaded. Cannot export MIDI.');
      console.error('(window as any).ABCJS is not defined. Ensure abcjs-midi-min.js is loaded.');
      return;
    }

    try {
      if (!visualRef.current) {
        throw new Error('Visual display not available for MIDI export.');
      }

      const dummyDiv = document.createElement('div');
      const visualObjs = (window as any).ABCJS.renderAbc(dummyDiv, musicData.abcNotation, {});

      if (!visualObjs || visualObjs.length === 0) {
        throw new Error('Failed to render ABC notation for MIDI export.');
      }

      const midiBuffer = new (window as any).ABCJS.synth.CreateSynth();
      await midiBuffer.init({
        visualObj: visualObjs[0],
        audioContext: new AudioContext(),
      });
      const midi = await midiBuffer.getMidiFile();
      
      const blob = new Blob([midi], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${musicData.title || 'untitled'}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate or download MIDI:', error);
      alert('Failed to export MIDI. Please try again.');
    }
  };

  const handleDownloadSvg = () => {
    if (!musicData.abcNotation || !visualRef.current) {
      alert('No sheet music to export as SVG.');
      return;
    }

    const svgElement = visualRef.current.querySelector('svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${musicData.title || 'untitled'}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('Could not find SVG content to export.');
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700 animate-fade-in">
        <div className="flex flex-col gap-6 md:gap-8"> {/* Removed md:flex-row as there's no image column */}
            <div className="flex-grow min-w-0"> {/* This will now take full width */}
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 truncate" aria-label={`Music title: ${musicData.title}`}>{musicData.title}</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                  <div id="audio-controls" ref={audioRef} className="flex-grow" aria-live="polite" aria-label="Music playback controls"></div>
                  <button
                    onClick={handleDownloadMidi}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                    aria-label="Export as MIDI file"
                  >
                    Export as MIDI
                  </button>
                  <button
                    onClick={handleDownloadSvg}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                    aria-label="Export as SVG file"
                  >
                    Export as SVG
                  </button>
                </div>
                {renderError ? (
                    <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg" role="alert">
                        <p>{renderError}</p>
                        <p className="mt-2 text-sm">Please try a different prompt or check the console for more details.</p>
                    </div>
                ) : (
                    <div 
                        id="sheet-music" 
                        ref={visualRef} 
                        className="bg-white p-4 rounded-md overflow-x-auto text-black"
                        aria-label="Sheet music notation"
                    >
                        {/* Placeholder for when visualRef.current is empty but not an error state */}
                        {!musicData.abcNotation && <p className="text-gray-500">Music notation will appear here.</p>}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
