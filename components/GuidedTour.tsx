import React, { useState, useEffect } from 'react';
import { ViewState, TourStep } from '../types';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onStepChange: (view: ViewState) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ steps, onComplete, onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0, arrowSide: 'left' });
  const [tick, setTick] = useState(0); // Used to force re-renders on scroll
  const step = steps[currentStep];

  useEffect(() => {
    // Navigate to the view required for this step
    onStepChange(step.view);

    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            setBubblePos({ 
                top: rect.top - 180, 
                left: window.innerWidth / 2, 
                arrowSide: 'bottom' 
            });
        } else {
            setBubblePos({ 
                top: rect.top + rect.height / 2, 
                left: rect.right + 25, 
                arrowSide: 'left' 
            });
        }
      }
    };

    // Re-calc on scroll/resize/render
    const handleScroll = () => {
        updatePosition();
        setTick(t => t + 1);
    };

    const timer = setTimeout(updatePosition, 150);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true); // Capture phase to catch all scrolling containers
    
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', handleScroll, true);
    };
  }, [currentStep, step.targetId, step.view, onStepChange]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const targetRect = document.getElementById(step.targetId)?.getBoundingClientRect();

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Dimmed Overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px] pointer-events-auto" onClick={onComplete}></div>
      
      {/* Bubble Tooltip */}
      <div 
        className={`absolute w-[340px] bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-8 border-2 border-blue-500/50 pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.2,1,0.3,1)] animate-in zoom-in-95
            ${bubblePos.arrowSide === 'bottom' ? '-translate-x-1/2' : '-translate-y-1/2'}`}
        style={{ top: bubblePos.top, left: bubblePos.left }}
      >
        {/* Arrow Component */}
        <div className={`absolute w-5 h-5 bg-white dark:bg-slate-800 border-2 border-blue-500/50 rotate-45 
            ${bubblePos.arrowSide === 'left' ? '-left-3 top-1/2 -translate-y-1/2 border-r-0 border-t-0' : 
              bubblePos.arrowSide === 'bottom' ? '-bottom-3 left-1/2 -translate-x-1/2 border-l-0 border-t-0' : ''}`}>
        </div>

        <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <div className="p-2 bg-blue-500/10 rounded-lg animate-pulse">
                    <Sparkles size={18} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">{step.title}</h4>
             </div>
             <button onClick={onComplete} className="p-1 text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={18} />
             </button>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8 font-medium">
            {step.content}
        </p>

        <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
                {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-6 bg-blue-500 shadow-sm shadow-blue-500/40' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`} />
                ))}
            </div>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}
                <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 transition-all active:scale-95"
                >
                    {currentStep === steps.length - 1 ? 'Start Exploration' : 'Proceed'}
                    {currentStep < steps.length - 1 && <ChevronRight size={14} />}
                </button>
            </div>
        </div>
      </div>

      {/* Dynamic Target Lens Effect */}
      {targetRect && (
        <div 
          className="absolute pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.2,1,0.3,1)] border-2 border-blue-400 rounded-2xl animate-pulse shadow-[0_0_0_100vw_rgba(0,0,0,0.15)]"
          style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
          }}
        />
      )}
    </div>
  );
};