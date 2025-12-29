'use client';

import React from 'react';
import Link from 'next/link';

const GraphQLPlaygroundCard = (props) => {
  const { 
    title = "GraphQL Playground", 
    description = "Explore GraphQL APIs with GraphiQL and the Explorer plugin",
    className 
  } = props;

  return (
    <Link 
      href="/graphql-playground" 
      className={`block no-underline ${className}`}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all group">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {description}
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all text-gray-400 group-hover:text-indigo-500">
            <i className="pi pi-code text-lg"></i>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default GraphQLPlaygroundCard;

