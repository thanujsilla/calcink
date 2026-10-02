import React, { useRef, useEffect, useState, useCallback } from 'react';
import getStroke from 'perfect-freehand';
import type { Stroke, Point } from '../types';
import { Undo, Redo, Eraser, Pen, Trash2 } from 'lucide-react';

export const CanvasEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  
  const isDrawing = useRef(false);
  const currentStroke = useRef<Point[]>([]);

  // High-DPI / Retina canvas scaling
  const setupCanvasScaling = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    redrawCanvas();
  }, [strokes]);

  // Convert stroke path points from perfect-freehand to HTML5 Canvas Path2D
  const getStrokePath = (points: Point[], size: number) => {
    const strokePoints = getStroke(points, {
      size: size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });

    if (!strokePoints.length) return new Path2D();

    const pathData = strokePoints.reduce(
      (acc, [x0, y0], i, arr) => {
        if (i === 0) return `M ${x0} ${y0}`;
        const [x1, y1] = arr[(i + 1) % arr.length];
        return `${acc} Q ${x0} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`;
      },
      ''
    );

    return new Path2D(pathData);
  };

  // Render loop using requestAnimationFrame for 60 FPS performance
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Render stored strokes
    strokes.forEach((stroke) => {
      ctx.fillStyle = stroke.isEraser ? '#ffffff' : stroke.color;
      const path = getStrokePath(stroke.points, stroke.size);
      ctx.fill(path);
    });

    // Render active drawing stroke
    if (isDrawing.current && currentStroke.current.length > 0) {
      ctx.fillStyle = activeTool === 'eraser' ? '#ffffff' : '#000000';
      const path = getStrokePath(currentStroke.current, activeTool === 'eraser' ? 24 : 4);
      ctx.fill(path);
    }
  }, [strokes, activeTool]);

  useEffect(() => {
    setupCanvasScaling();
    window.addEventListener('resize', setupCanvasScaling);
    return () => window.removeEventListener('resize', setupCanvasScaling);
  }, [setupCanvasScaling]);

  // Pointer event handlers bypassing React state lag
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    currentStroke.current = [
      { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure },
    ];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    currentStroke.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
    });

    requestAnimationFrame(redrawCanvas);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDrawing.current = false;

    if (currentStroke.current.length > 0) {
      const newStroke: Stroke = {
        id: Date.now().toString(),
        points: [...currentStroke.current],
        color: '#000000',
        size: activeTool === 'eraser' ? 24 : 4,
        isEraser: activeTool === 'eraser',
      };
      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
      currentStroke.current = [];
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, last]);
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
  };

  return (
    <div className="relative w-full h-screen bg-slate-50 flex flex-col items-center">
      <div className="absolute top-4 z-10 flex gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200">
        <button
          onClick={() => setActiveTool('pen')}
          className={`p-2 rounded-lg ${activeTool === 'pen' ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
          title="Pen Tool"
        >
          <Pen size={20} />
        </button>
        <button
          onClick={() => setActiveTool('eraser')}
          className={`p-2 rounded-lg ${activeTool === 'eraser' ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
          title="Eraser Tool"
        >
          <Eraser size={20} />
        </button>
        <div className="w-px h-6 bg-slate-200 self-center mx-1" />
        <button onClick={handleUndo} disabled={strokes.length === 0} className="p-2 text-slate-600 disabled:opacity-30">
          <Undo size={20} />
        </button>
        <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 text-slate-600 disabled:opacity-30">
          <Redo size={20} />
        </button>
        <button onClick={handleClear} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
          <Trash2 size={20} />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full touch-none cursor-crosshair"
      />
    </div>
  );
};