import { flatten } from 'flat';

/**
 * Function to detect array-of-object fields in data
 * @param {Array} data - Array of data objects
 * @returns {Array} Array of field names that contain arrays of objects
 */
export function detectArrayOfObjectFields(data) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const fieldSet = new Set();

  // Check first few rows to find array-of-object fields
  const sampleSize = Math.min(10, data.length);
  for (let i = 0; i < sampleSize; i++) {
    const row = data[i];
    if (row && typeof row === 'object') {
      for (const [key, value] of Object.entries(row)) {
        let isArrayOfObjects = false;

        // Check if value is an array of objects
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
            isArrayOfObjects = true;
          }
        }

        if (isArrayOfObjects) {
          fieldSet.add(key);
        }
      }
    }
  }

  return Array.from(fieldSet);
}

/**
 * Function to flatten parent + items into one list
 * @param {Array} primary - Array of parent objects
 * @param {string} itemsFieldName - Name of the field containing items array
 * @returns {Array} Flattened array where each item is merged with its parent
 */
export function flattenParentItems(primary, itemsFieldName) {
  if (!Array.isArray(primary) || primary.length === 0) return [];

  return primary.flatMap(({ [itemsFieldName]: items, ...parent }) => {
    // Use items as-is if it's an array, otherwise empty array
    const itemsArray = Array.isArray(items) ? items : [];

    // If no items, return the parent with the items field removed
    if (itemsArray.length === 0) {
      return [parent];
    }

    // Filter parent to only include primitive values
    const filteredParent = Object.fromEntries(
      Object.entries(parent).filter(
        ([, v]) =>
          v === null ||
          ["string", "number", "boolean"].includes(typeof v)
      )
    );

    // Map each item and merge with parent
    return itemsArray.map(item => ({
      ...filteredParent,
      ...item
    }));
  });
}

/**
 * Flatten array of node objects to 1D using flat library
 * @param {Array} nodes - Array of node objects
 * @returns {Array} Array of flattened objects
 */
export function flattenResponse(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  try {
    // Flatten each node object to 1D
    const flattened = nodes.map((node, index) => {
      if (!node || typeof node !== 'object') {
        return { __index__: index, value: node };
      }

      // Use flat library to flatten nested objects to 1D with underscore separator
      const flattenedNode = flatten(node, {
        delimiter: '_',  // Use underscore as separator
        safe: true,       // Don't flatten arrays (keep them as-is)
        maxDepth: 10,     // Maximum depth to flatten
      });

      // Process the flattened object - keep arrays as arrays
      const processed = { __index__: index };
      for (const key in flattenedNode) {
        if (flattenedNode.hasOwnProperty(key)) {
          processed[key] = flattenedNode[key];
        }
      }

      return processed;
    });

    return flattened;
  } catch (error) {
    console.error('Error flattening response:', error);
    return [];
  }
}

/**
 * Remove __index__ keys from processed data
 * @param {any} data - Data to clean (can be object, array, or primitive)
 * @returns {any} Data with __index__ keys removed
 */
export function removeIndexKeys(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => removeIndexKeys(item));
  }

  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      if (key !== '__index__') {
        cleaned[key] = removeIndexKeys(value);
      }
    }
    return cleaned;
  }

  return data;
}

