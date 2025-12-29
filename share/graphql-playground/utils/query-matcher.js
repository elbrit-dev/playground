import { parse, getOperationAST } from 'graphql';

/**
 * Finds a node in the tree by its key
 * @param {Array} nodes - Array of tree nodes
 * @param {string} key - The key to search for
 * @returns {Object|null} The found node or null
 */
export const findNodeByKey = (nodes, key) => {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Finds the parent node key for a given key
 * @param {Array} nodes - Array of tree nodes (unused but kept for API consistency)
 * @param {string} key - The key to find parent for
 * @returns {string|null} The parent key or null
 */
export const findParentNodeKey = (nodes, key) => {
  if (!key || !key.includes('.')) return null;
  const parts = key.split('.');
  const parentKey = parts.slice(0, -1).join('.');
  return parentKey;
};

/**
 * Finds a node key from an index query by matching the query structure to tree nodes
 * @param {string} indexQuery - The GraphQL query string to match
 * @param {Array} nodes - Array of tree nodes to search in
 * @returns {string|null} The matching node key or null
 */
export const findNodeKeyFromIndexQuery = (indexQuery, nodes) => {
  if (!indexQuery || !indexQuery.trim() || !nodes || nodes.length === 0) {
    return null;
  }

  try {
    const ast = parse(indexQuery);
    const operation = getOperationAST(ast);
    if (!operation || !operation.selectionSet || !operation.selectionSet.selections || operation.selectionSet.selections.length === 0) {
      return null;
    }

    const selection = operation.selectionSet.selections[0];
    if (selection.kind !== 'Field') {
      return null;
    }

    const findMatchingNode = (fieldSelection, currentNodeNodes, currentPath = '') => {
      const fieldName = fieldSelection.alias?.value || fieldSelection.name.value;
      const matchingNode = currentNodeNodes.find(node => {
        const nodeName = node.data.name;
        return nodeName === fieldName;
      });

      if (!matchingNode) {
        return null;
      }

      const newPath = currentPath ? `${currentPath}.${fieldName}` : fieldName;

      if (fieldSelection.selectionSet && fieldSelection.selectionSet.selections && fieldSelection.selectionSet.selections.length > 0) {
        if (matchingNode.children && matchingNode.children.length > 0) {
          const childSelection = fieldSelection.selectionSet.selections[0];
          if (childSelection.kind === 'Field') {
            const childPath = findMatchingNode(childSelection, matchingNode.children, newPath);
            if (childPath) {
              return childPath;
            }
          }
        }
      }

      return newPath;
    };

    return findMatchingNode(selection, nodes);
  } catch (error) {
    console.error('Error parsing index query:', error);
    return null;
  }
};

