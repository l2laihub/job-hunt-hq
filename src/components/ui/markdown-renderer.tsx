import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/src/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  variant = 'default',
}) => {
  const baseStyles = variant === 'compact' ? 'text-sm' : 'text-[15px]';

  return (
    <div
      className={cn(
        'prose prose-invert max-w-none',
        baseStyles,
        // Headers
        'prose-headings:text-white prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-3',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm',
        // Paragraphs - improved readability
        'prose-p:text-gray-300 prose-p:leading-[1.8] prose-p:tracking-wide prose-p:my-3',
        // Lists - improved spacing
        'prose-ul:my-3 prose-ul:pl-5 prose-ol:my-3 prose-ol:pl-5',
        'prose-li:text-gray-300 prose-li:my-2 prose-li:leading-[1.7] prose-li:marker:text-gray-500',
        // Strong and emphasis
        'prose-strong:text-white prose-strong:font-semibold',
        'prose-em:text-gray-200 prose-em:italic',
        // Code
        'prose-code:text-yellow-400 prose-code:bg-gray-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-gray-800/70 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-4 prose-pre:overflow-x-auto',
        // Blockquotes - improved spacing
        'prose-blockquote:border-l-2 prose-blockquote:border-yellow-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400 prose-blockquote:my-4',
        // Links
        'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
        // HR
        'prose-hr:border-gray-700 prose-hr:my-5',
        // Tables
        'prose-table:border-collapse prose-table:w-full prose-table:my-4',
        'prose-th:bg-gray-800 prose-th:text-gray-300 prose-th:px-3 prose-th:py-2.5 prose-th:text-left prose-th:border prose-th:border-gray-700 prose-th:text-sm prose-th:font-semibold',
        'prose-td:px-3 prose-td:py-2.5 prose-td:border prose-td:border-gray-700 prose-td:text-gray-400 prose-td:text-sm',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
};
