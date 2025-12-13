import React from 'react';
import { JobApplication } from '../types';
import { Calendar, DollarSign, Building, Briefcase } from 'lucide-react';

interface JobCardProps {
  application: JobApplication;
  onClick: (app: JobApplication) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

const getFitColor = (score?: number) => {
  if (score === undefined) return 'bg-gray-700 text-gray-300 border-gray-600';
  if (score >= 8) return 'bg-green-900/40 text-green-300 border-green-700/50';
  if (score >= 5) return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50';
  return 'bg-red-900/40 text-red-300 border-red-700/50';
};

export const JobCard: React.FC<JobCardProps> = ({ application, onClick, onDragStart }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, application.id)}
      onClick={() => onClick(application)}
      className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-lg p-4 cursor-pointer transition-all shadow-sm hover:shadow-md group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-100 truncate pr-2">{application.role}</h3>
        {application.analysis && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getFitColor(application.analysis.fitScore)}`}>
            {application.analysis.fitScore}/10
          </span>
        )}
      </div>
      
      <div className="flex items-center text-sm text-gray-400 mb-3">
        <Building className="w-3 h-3 mr-1.5" />
        <span className="truncate">{application.company}</span>
      </div>

      <div className="space-y-1.5">
        {application.salaryRange && (
          <div className="flex items-center text-xs text-gray-500">
            <DollarSign className="w-3 h-3 mr-1.5 text-gray-600" />
            {application.salaryRange}
          </div>
        )}
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1.5 text-gray-600" />
          {application.dateApplied ? new Date(application.dateApplied).toLocaleDateString() : 'Not applied'}
        </div>
      </div>
      
      {/* Hover visual cue for draggable */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 rounded bg-gray-700 text-gray-400">
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
        </div>
      </div>
    </div>
  );
};