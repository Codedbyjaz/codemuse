import React from 'react';

export function ConceptTag({ concept, learned = true }: { concept: string, learned?: boolean }) {
  return (
    <span className={`concept-tag bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs py-0.5 px-2 rounded-full ${!learned && 'opacity-50'}`}>
      {concept}
    </span>
  );
}