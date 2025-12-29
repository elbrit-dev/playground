'use client';

import { useEffect } from 'react';
import { useGraphiQL } from '@graphiql/react';
import { extractDataFromResponse } from '../utils/data-extractor';

export function GraphiQLResponseExtractor({ tableMode, onDataExtracted, flattenResponse }) {
  const responseEditor = useGraphiQL((state) => state.responseEditor);
  const response = useGraphiQL((state) => state.response);
  const queryEditor = useGraphiQL((state) => state.queryEditor);

  useEffect(() => {
    if (!tableMode) {
      onDataExtracted(null);
      return;
    }

    // Extract data once when toggle is switched on
    const extractData = () => {
      let jsonData = null;

      // First, try to get response from GraphiQL state (if available)
      if (responseEditor) {
        try {
          const jsonText = responseEditor.getValue() || '';
          if (jsonText) {
            jsonData = JSON.parse(jsonText);
          }
        } catch (e) {
          // If parsing fails, continue
        }
      }

      // If state didn't work, try to get from response object
      if (!jsonData && response) {
        try {
          if (typeof response === 'string') {
            jsonData = JSON.parse(response);
          } else if (typeof response === 'object') {
            jsonData = response;
          }
        } catch (e) {
          // Continue
        }
      }

      if (!jsonData) {
        console.log('No JSON data found in response');
        onDataExtracted(null);
        return;
      }

      // Get query string from editor
      const queryString = queryEditor?.getValue() || '';
      if (!queryString.trim()) {
        onDataExtracted(null);
        return;
      }

      // Use the abstracted extraction function
      const extractedData = extractDataFromResponse(jsonData, queryString);
      onDataExtracted(extractedData);
    };

    extractData();
  }, [tableMode, responseEditor, response, queryEditor, onDataExtracted]);

  return null; // This component doesn't render anything
}

