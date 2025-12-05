import React from 'react';

interface Props {
  isActive: boolean;
}

const Visualizer: React.FC<Props> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="flex items-end justify-center h-12 space-x-1 my-4">
      <div className="w-1.5 bg-orange-500 rounded-t-sm h-3 bar"></div>
      <div className="w-1.5 bg-orange-500 rounded-t-sm h-5 bar"></div>
      <div className="w-1.5 bg-orange-500 rounded-t-sm h-8 bar"></div>
      <div className="w-1.5 bg-orange-500 rounded-t-sm h-4 bar"></div>
      <div className="w-1.5 bg-orange-500 rounded-t-sm h-6 bar"></div>
      <div className="w-1.5 bg-orange-500 rounded-t-sm h-3 bar"></div>
    </div>
  );
};

export default Visualizer;