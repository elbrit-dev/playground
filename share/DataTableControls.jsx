'use client';

import React, { useState } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { isEmpty, includes, filter, startCase, toLower } from 'lodash';

function SingleFieldSelector({ columns, selectedField, onSelectionChange, formatFieldName, placeholder, label }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredColumns = React.useMemo(() => {
    if (!searchTerm) return columns;
    const term = toLower(searchTerm);
    return filter(columns, col =>
      includes(toLower(col), term) ||
      includes(toLower(formatFieldName(col)), term)
    );
  }, [columns, searchTerm, formatFieldName]);

  const selectField = (field) => {
    if (selectedField === field) {
      onSelectionChange(null);
    } else {
      onSelectionChange(field);
    }
    setIsOpen(false);
  };

  const clearField = () => {
    onSelectionChange(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        <span className="flex items-center gap-2 text-gray-700">
          <i className="pi pi-sitemap text-gray-500"></i>
          {selectedField ? (
            <span>{formatFieldName(selectedField)}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </span>
        <i className={`pi ${isOpen ? 'pi-chevron-up' : 'pi-chevron-down'} text-gray-500 text-xs`}></i>
      </button>

      {selectedField && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md">
            {formatFieldName(selectedField)}
            <button
              type="button"
              onClick={clearField}
              className="hover:text-purple-600 transition-colors"
            >
              <i className="pi pi-times text-[10px]"></i>
            </button>
          </span>
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fields..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="pi pi-times text-xs"></i>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isEmpty(filteredColumns) ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                <i className="pi pi-search text-gray-400 mb-1"></i>
                <p>No fields match "{searchTerm}"</p>
              </div>
            ) : (
              filteredColumns.map(col => {
                const isSelected = selectedField === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => selectField(col)}
                    className={`w-full flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-left ${isSelected
                      ? 'bg-purple-50 hover:bg-purple-100'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    <i className={`pi ${isSelected ? 'pi-check-circle text-purple-600' : 'pi-circle text-gray-400'} text-xs`}></i>
                    <span className={`text-sm flex-1 ${isSelected ? 'text-purple-900 font-medium' : 'text-gray-700'}`}>
                      {formatFieldName(col)}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {col}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {filteredColumns.length} of {columns.length} fields shown
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPicker({ columns, selectedFields, onSelectionChange, formatFieldName }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredColumns = React.useMemo(() => {
    if (!searchTerm) return columns;
    const term = toLower(searchTerm);
    return filter(columns, col =>
      includes(toLower(col), term) ||
      includes(toLower(formatFieldName(col)), term)
    );
  }, [columns, searchTerm, formatFieldName]);

  const toggleField = (field) => {
    if (includes(selectedFields, field)) {
      onSelectionChange(filter(selectedFields, f => f !== field));
    } else {
      onSelectionChange([...selectedFields, field]);
    }
  };

  const selectAll = () => {
    onSelectionChange([...columns]);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        <span className="flex items-center gap-2 text-gray-700">
          <i className="pi pi-list text-gray-500"></i>
          {isEmpty(selectedFields) ? (
            <span className="text-gray-500">Select fields...</span>
          ) : (
            <span>{selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected</span>
          )}
        </span>
        <i className={`pi ${isOpen ? 'pi-chevron-up' : 'pi-chevron-down'} text-gray-500 text-xs`}></i>
      </button>

      {!isEmpty(selectedFields) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedFields.map(field => (
            <span
              key={field}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
            >
              {formatFieldName(field)}
              <button
                type="button"
                onClick={() => toggleField(field)}
                className="hover:text-blue-600 transition-colors"
              >
                <i className="pi pi-times text-[10px]"></i>
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fields..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="pi pi-times text-xs"></i>
                </button>
              )}
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Select all
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isEmpty(filteredColumns) ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                <i className="pi pi-search text-gray-400 mb-1"></i>
                <p>No fields match "{searchTerm}"</p>
              </div>
            ) : (
              filteredColumns.map(col => {
                const isSelected = includes(selectedFields, col);
                return (
                  <label
                    key={col}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${isSelected
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleField(col)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                      {formatFieldName(col)}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto font-mono">
                      {col}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {filteredColumns.length} of {columns.length} fields shown
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataTableControls({
  enableSort,
  enableFilter,
  enableSummation,
  enableCellEdit = false,
  rowsPerPageOptions,
  defaultRows,
  columns = [],
  textFilterColumns = [],
  visibleColumns = [],
  redFields = [],
  greenFields = [],
  outerGroupField = null,
  innerGroupField = null,
  nonEditableColumns = [],
  enableTargetData = false,
  targetColumns = [],
  targetOuterGroupField = null,
  targetInnerGroupField = null,
  targetValueField = null,
  actualValueField = null,
  onSortChange,
  onFilterChange,
  onSummationChange,
  onCellEditChange,
  onRowsPerPageOptionsChange,
  onDefaultRowsChange,
  onTextFilterColumnsChange,
  onVisibleColumnsChange,
  onRedFieldsChange,
  onGreenFieldsChange,
  onOuterGroupFieldChange,
  onInnerGroupFieldChange,
  onNonEditableColumnsChange,
  onEnableTargetDataChange,
  onTargetOuterGroupFieldChange,
  onTargetInnerGroupFieldChange,
  onTargetValueFieldChange,
  onActualValueFieldChange,
}) {
  const [customOptions, setCustomOptions] = useState(
    Array.isArray(rowsPerPageOptions) ? rowsPerPageOptions.join(', ') : ''
  );
  const isInternalUpdateRef = React.useRef(false);

  React.useEffect(() => {
    if (!isInternalUpdateRef.current && Array.isArray(rowsPerPageOptions)) {
      const propsValue = rowsPerPageOptions.join(', ');
      if (propsValue !== customOptions) {
        setCustomOptions(propsValue);
      }
    }
    isInternalUpdateRef.current = false;
  }, [rowsPerPageOptions]);

  const handleOptionsChange = (value) => {
    setCustomOptions(value);
    isInternalUpdateRef.current = true;

    const rawValues = value.split(',').map(v => v.trim());
    const seen = new Set();
    const validOptions = [];

    rawValues.forEach(v => {
      const parsed = parseInt(v, 10);
      if (!isNaN(parsed) && parsed > 0) {
        if (!seen.has(parsed)) {
          seen.add(parsed);
          validOptions.push(parsed);
        }
      }
    });

    const options = validOptions.sort((a, b) => a - b);

    if (options.length > 0) {
      onRowsPerPageOptionsChange(options);

      if (defaultRows && !options.includes(defaultRows) && onDefaultRowsChange) {
        const newDefault = options[0];
        if (typeof newDefault === 'number' && !isNaN(newDefault) && newDefault > 0) {
          onDefaultRowsChange(newDefault);
        }
      }
    }
  };

  const formatFieldName = React.useCallback((key) => {
    return startCase(key.split('__').join(' ').split('_').join(' '));
  }, []);

  const ToggleSwitch = ({ checked, onChange, label, icon, isLast = false }) => (
    <div className={`flex items-center justify-between p-3 ${!isLast ? 'border-bottom-1 surface-border' : ''}`}>
      <div className="flex align-items-center gap-2">
        <i className={`${icon} ${checked ? 'text-blue-600' : 'text-gray-600'}`}></i>
        <span className="font-medium">{label}</span>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
          onClick={() => onChange(!checked)}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
            style={{ marginTop: '2px' }}
          ></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <i className="pi pi-table text-xl text-primary"></i>
        <span className="font-semibold text-lg text-primary">Table Settings</span>
      </div>
      
      {/* Scrollable Content with Accordion */}
      <div className="flex-1 overflow-y-auto p-4">
        <Accordion multiple activeIndex={[0]}>
              {/* TABLE FEATURES */}
              <AccordionTab header={
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-cog"></i>
                  <span>Table Features</span>
                </div>
              }>
                <div className="m-0">
                  <ToggleSwitch
                    checked={enableSort}
                    onChange={onSortChange}
                    label="Sorting"
                    icon="pi pi-sort"
                  />
                  <ToggleSwitch
                    checked={enableFilter}
                    onChange={onFilterChange}
                    label="Filtering"
                    icon="pi pi-filter"
                  />
                  <ToggleSwitch
                    checked={enableSummation}
                    onChange={onSummationChange}
                    label="Summation"
                    icon="pi pi-calculator"
                  />
                  {onCellEditChange && (
                    <ToggleSwitch
                      checked={enableCellEdit}
                      onChange={onCellEditChange}
                      label="Cell Editing"
                      icon="pi pi-pencil"
                      isLast={true}
                    />
                  )}
                </div>
              </AccordionTab>

              {/* COLUMN CONFIGURATION */}
              {!isEmpty(columns) && (
                <AccordionTab header={
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-list"></i>
                    <span>Column Configuration</span>
                  </div>
                }>
                  <div className="m-0">
                    {enableFilter && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <i className="pi pi-search mr-2"></i>
                          Text Search Fields
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Fields that use text search instead of multiselect
                        </p>
                        <FieldPicker
                          columns={columns}
                          selectedFields={textFilterColumns}
                          onSelectionChange={onTextFilterColumnsChange}
                          formatFieldName={formatFieldName}
                        />
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <i className="pi pi-eye mr-2"></i>
                        Visible Columns
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Select fields to display (empty = show all)
                      </p>
                      <FieldPicker
                        columns={columns}
                        selectedFields={visibleColumns}
                        onSelectionChange={onVisibleColumnsChange}
                        formatFieldName={formatFieldName}
                      />
                    </div>
                    {enableCellEdit && onNonEditableColumnsChange && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <i className="pi pi-lock mr-2"></i>
                          Non-Editable Columns
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Fields that cannot be edited
                        </p>
                        <FieldPicker
                          columns={columns}
                          selectedFields={nonEditableColumns}
                          onSelectionChange={onNonEditableColumnsChange}
                          formatFieldName={formatFieldName}
                        />
                      </div>
                    )}
                  </div>
                </AccordionTab>
              )}

              {/* GROUPING */}
              {!isEmpty(columns) && (
                <AccordionTab header={
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-sitemap"></i>
                    <span>Grouping</span>
                  </div>
                }>
                  <div className="m-0">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Outer Group (Expandable Header)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Creates expandable row groups
                      </p>
                      <SingleFieldSelector
                        columns={columns}
                        selectedField={outerGroupField}
                        onSelectionChange={onOuterGroupFieldChange}
                        formatFieldName={formatFieldName}
                        placeholder="Select outer group field..."
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inner Group (Aggregation Anchor)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Aggregates data within each outer group
                      </p>
                      <SingleFieldSelector
                        columns={columns}
                        selectedField={innerGroupField}
                        onSelectionChange={onInnerGroupFieldChange}
                        formatFieldName={formatFieldName}
                        placeholder="Select inner group field..."
                      />
                    </div>
                  </div>
                </AccordionTab>
              )}

              {/* TARGET DATA */}
              {outerGroupField && innerGroupField && !isEmpty(targetColumns) && (
                <AccordionTab header={
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-bullseye"></i>
                    <span>Target Data</span>
                  </div>
                }>
                  <div className="m-0">
                    <div className="flex align-items-center justify-content-between p-3 border-bottom-1 surface-border mb-3">
                      <div className="flex align-items-center gap-2">
                        <i className={`pi pi-bullseye ${enableTargetData ? 'text-blue-600' : 'text-gray-600'}`}></i>
                        <span className="font-medium">Enable Target Data</span>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={enableTargetData}
                          onChange={(e) => onEnableTargetDataChange && onEnableTargetDataChange(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${enableTargetData ? 'bg-blue-600' : 'bg-gray-300'}`}
                          onClick={() => onEnableTargetDataChange && onEnableTargetDataChange(!enableTargetData)}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${enableTargetData ? 'translate-x-5' : 'translate-x-0.5'}`}
                            style={{ marginTop: '2px' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {enableTargetData && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Outer Group Field
                          </label>
                          <SingleFieldSelector
                            columns={targetColumns}
                            selectedField={targetOuterGroupField}
                            onSelectionChange={onTargetOuterGroupFieldChange}
                            formatFieldName={formatFieldName}
                            placeholder="Map to Outer Group..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Inner Group Field
                          </label>
                          <SingleFieldSelector
                            columns={targetColumns}
                            selectedField={targetInnerGroupField}
                            onSelectionChange={onTargetInnerGroupFieldChange}
                            formatFieldName={formatFieldName}
                            placeholder="Map to Inner Group..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Value Field
                          </label>
                          <SingleFieldSelector
                            columns={targetColumns}
                            selectedField={targetValueField}
                            onSelectionChange={onTargetValueFieldChange}
                            formatFieldName={formatFieldName}
                            placeholder="Select target value field..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Actual Value Field
                          </label>
                          <SingleFieldSelector
                            columns={columns}
                            selectedField={actualValueField}
                            onSelectionChange={onActualValueFieldChange}
                            formatFieldName={formatFieldName}
                            placeholder="Select actual value field..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionTab>
              )}

              {/* STYLING */}
              {enableSummation && !isEmpty(columns) && (
                <AccordionTab header={
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-palette"></i>
                    <span>Styling</span>
                  </div>
                }>
                  <div className="m-0">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-red-700 mb-2">
                        Red Fields
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Summation totals in red
                      </p>
                      <FieldPicker
                        columns={columns}
                        selectedFields={redFields}
                        onSelectionChange={onRedFieldsChange}
                        formatFieldName={formatFieldName}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-green-700 mb-2">
                        Green Fields
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Summation totals in green
                      </p>
                      <FieldPicker
                        columns={columns}
                        selectedFields={greenFields}
                        onSelectionChange={onGreenFieldsChange}
                        formatFieldName={formatFieldName}
                      />
                    </div>
                  </div>
                </AccordionTab>
              )}

              {/* PAGINATION */}
              <AccordionTab header={
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-list"></i>
                  <span>Pagination</span>
                </div>
              }>
                <div className="m-0">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={customOptions}
                      onChange={(e) => handleOptionsChange(e.target.value)}
                      placeholder="5, 10, 25, 50, 100"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter numbers separated by commas
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Rows Per Page
                    </label>
                    <select
                      key={`default-rows-${rowsPerPageOptions?.join('-') || ''}`}
                      value={defaultRows || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0 && onDefaultRowsChange) {
                          onDefaultRowsChange(value);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select default...</option>
                      {rowsPerPageOptions && Array.isArray(rowsPerPageOptions) && rowsPerPageOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Default number of rows per page
                    </p>
                  </div>
                </div>
              </AccordionTab>
        </Accordion>
      </div>
    </div>
  );
}
