'use client';

import { useEffect } from 'react';
import { useGraphiQL, useGraphiQLActions } from '@graphiql/react';
import { confirmDialog } from 'primereact/confirmdialog';
import { useQueryHistoryStore } from '../stores/useQueryHistoryStore';

export function HistoryPluginContent() {
  const { queries, loading, selectedQueryId, setSelectedQueryId, loadQueries, deleteQuery } = useQueryHistoryStore();
  const { addTab, updateActiveTabValues } = useGraphiQLActions();
  const queryEditor = useGraphiQL((state) => state.queryEditor);
  const variableEditor = useGraphiQL((state) => state.variableEditor);
  const currentQuery = useGraphiQL((state) => state.queryEditor?.getValue() || '');

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  // Update selected query when current query changes
  useEffect(() => {
    if (currentQuery && queries.length > 0) {
      const normalizedCurrent = currentQuery.trim().replace(/\s+/g, ' ');
      const matchingQuery = queries.find(q => {
        if (!q.body || !q.body.trim()) return false;
        const normalizedSaved = q.body.trim().replace(/\s+/g, ' ');
        return normalizedCurrent === normalizedSaved || normalizedCurrent.includes(normalizedSaved.substring(0, 50));
      });
      if (matchingQuery) {
        setSelectedQueryId(matchingQuery.id);
      } else {
        setSelectedQueryId(null);
      }
    } else {
      setSelectedQueryId(null);
    }
  }, [currentQuery, queries, setSelectedQueryId]);

  const handleQueryClick = (query, event) => {
    if (!query.body || !query.body.trim()) return;

    // Always open in new tab
    addTab();
    // The new tab will be created and become active
    // Use updateActiveTabValues to set the query and variables in the new tab
    setTimeout(() => {
      updateActiveTabValues({ 
        query: query.body,
        variables: query.variables || ''
      });
      // Also update the editors if they exist
      if (queryEditor) {
        queryEditor.setValue(query.body);
      }
      if (variableEditor && query.variables) {
        variableEditor.setValue(query.variables);
      }
    }, 10);
  };

  const handleDeleteQuery = async (queryId, queryName, event) => {
    // Stop event propagation and prevent default to prevent triggering query click
    event.stopPropagation();
    event.preventDefault();

    confirmDialog({
      message: (
        <div>
          <p style={{ marginBottom: '0.5rem' }}>
            Are you sure you want to delete this query?
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            fontStyle: 'italic',
            wordBreak: 'break-word'
          }}>
            "{queryName}"
          </p>
          <p style={{
            marginTop: '0.75rem',
            fontSize: '0.8125rem',
            color: '#9ca3af'
          }}>
            This action cannot be undone.
          </p>
        </div>
      ),
      header: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <i className="pi pi-exclamation-triangle" style={{ color: '#ef4444', fontSize: '1.25rem' }}></i>
          <span>Delete Query</span>
        </div>
      ),
      acceptClassName: 'p-confirm-dialog-accept',
      rejectClassName: 'p-confirm-dialog-reject',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: async () => {
        try {
          await deleteQuery(queryId);
        } catch (error) {
          console.error('Error deleting query:', error);
        }
      },
    });
  };

  return (
    <div className="graphiql-history-plugin h-full flex flex-col bg-white">
      <div className="graphiql-history-plugin-header flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 font-semibold text-[13px] text-gray-800 bg-white">
        <span>Saved Queries</span>
        {queries.length > 0 && (
          <span className="graphiql-history-plugin-header-count font-normal text-[11px] text-gray-500 ml-2">({queries.length})</span>
        )}
      </div>
      <div className="graphiql-history-plugin-content flex-1 overflow-y-auto overflow-x-hidden p-1">
        {loading ? (
          <div className="flex flex-col items-center gap-2.5 py-6 px-4 text-gray-500 text-xs">
            <div className="graphiql-history-loading-spinner"></div>
            <div>Loading queries...</div>
          </div>
        ) : queries.length === 0 ? (
          <div className="py-6 px-4 text-center text-gray-500 text-xs leading-relaxed">
            <div>No saved queries found</div>
            <div className="text-[10px] mt-1.5 opacity-70">
              Save queries using the Save button
            </div>
          </div>
        ) : (
          queries.map((query) => {
            const isSelected = selectedQueryId === query.id;
            return (
              <div
                key={query.id}
                className={`graphiql-history-item px-3 py-2.5 mx-1 rounded transition-all duration-150 text-xs border border-transparent bg-white relative flex flex-col justify-center gap-1 min-h-[48px] cursor-pointer ${isSelected ? 'selected' : ''}`}
                onClick={(e) => handleQueryClick(query, e)}
                title={query.body ? `Click to open in new tab: ${query.body.substring(0, 150)}` : ''}
              >
                <div className="flex items-center justify-between gap-2 min-h-[20px] leading-snug">
                  <div className="graphiql-history-item-name font-medium text-gray-800 leading-snug break-words flex-1 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center">{query.name}</div>
                  <div className="flex items-center gap-1 flex-wrap leading-snug">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium ${query.clientSave ? 'text-green-700' : 'text-yellow-700'}`}>
                        {query.clientSave ? 'Client' : 'Live'}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${query.clientSave ? 'bg-green-500' : 'bg-yellow-500'}`}
                        title={query.clientSave ? 'Client' : 'Live'}
                      ></div>
                    </div>
                    <button
                      className="graphiql-history-delete-btn"
                      onClick={(e) => handleDeleteQuery(query.id, query.name, e)}
                      title="Delete query"
                      aria-label="Delete query"
                    >
                      <i className="pi pi-trash" style={{ fontSize: '0.75rem' }}></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

