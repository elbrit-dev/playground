import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { doc, getDoc, getDocs, setDoc, collection, Bytes, onSnapshot, deleteField, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Fetches the metadata for a month (e.g., list of teams)
 */
export const getMonthMetadata = async (month) => {
  const monthRef = doc(db, 'Primary', month);
  const snap = await getDoc(monthRef);
  if (snap.exists()) {
    return snap.data();
  }
  return { teams: [] };
};

/**
 * Fetches the list of HQs for a specific team in a month
 */
export const getTeamHqs = async (month, teamName) => {
  if (!teamName) return [];
  const teamCollectionRef = collection(db, 'Primary', month, teamName);
  const snap = await getDocs(teamCollectionRef);
  return snap.docs.map(doc => doc.id).sort();
};

/**
 * Hook for Scoped Collaboration (Month -> Team -> HQ)
 * Manages selection internally to simplify UI components.
 */
export const useCollaboration = () => {
  // 1. Internal Selection State
  const [selectedMonth, setSelectedMonth] = useState('2025-12');
  const [selectedTeam, setSelectedTeam] = useState('CND Coimbatore');
  const [selectedHq, setSelectedHq] = useState('HQ-Salem');

  const [data, setData] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availableHqs, setAvailableHqs] = useState([]);
  const [status, setStatus] = useState("Connecting...");
  const [peers, setPeers] = useState(0);
  const [ydoc, setYdoc] = useState(null);

  // 1. Fetch available Teams for the selected month
  const refreshTeams = useCallback(async () => {
    try {
      const monthData = await getMonthMetadata(selectedMonth);
      const teams = monthData.teams || [];
      setAvailableTeams(teams);
      
      // Auto-select first team if none selected
      if (teams.length > 0 && !selectedTeam) {
        setSelectedTeam(teams[0]);
      }
    } catch (e) {
      console.error("Error fetching teams:", e);
    }
  }, [selectedMonth, selectedTeam]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  // 2. Fetch available HQs when a single Team is selected
  const refreshHqs = useCallback(async () => {
    if (!selectedTeam) {
      setAvailableHqs([]);
      return;
    }
    try {
      const hqs = await getTeamHqs(selectedMonth, selectedTeam);
      setAvailableHqs(hqs);

      // Auto-select first HQ if none selected
      if (hqs.length > 0 && !selectedHq) {
        setSelectedHq(hqs[0]);
      }
    } catch (e) {
      console.error("Error fetching HQs:", e);
    }
  }, [selectedMonth, selectedTeam, selectedHq]);

  useEffect(() => {
    refreshHqs();
  }, [refreshHqs]);

  // 3. Initialize Scoped Sync (WebRTC + Firestore)
  useEffect(() => {
    if (!selectedMonth || !selectedTeam || !selectedHq) {
      setData([]);
      setYdoc(null);
      setStatus(!selectedTeam ? "Select Team" : "Select HQ");
      return;
    }

    let cleanup;
    const setup = async () => {
      const docInstance = new Y.Doc();
      const roomName = `${selectedMonth}-${selectedTeam}-${selectedHq}`;

      // Local Persistence
      const persistence = new IndexeddbPersistence(roomName, docInstance);

      // P2P Sync
      const provider = new WebrtcProvider(roomName, docInstance, {
        signaling: ['ws://localhost:4444'],
        peerOpts: {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        }
      });

      // Firebase Sync
      const hqRef = doc(db, 'Primary', selectedMonth, selectedTeam, selectedHq);
      
      // Initial Load
      let isInitialLoad = true;
      try {
        console.log(`[collaboration] Fetching HQ data from Firestore: Primary/${selectedMonth}/${selectedTeam}/${selectedHq}`);
        const snap = await getDoc(hqRef);
        if (snap.exists()) {
          const hqData = snap.data();
          console.log(`[collaboration] HQ document found. Field hqUpdate length: ${hqData.hqUpdate?.toUint8Array().length || 0}`);
          if (hqData.hqUpdate) {
            Y.applyUpdate(docInstance, hqData.hqUpdate.toUint8Array());
            console.log(`[collaboration] Applied Yjs update from Firestore. Data count: ${docInstance.getArray('data').length}`);
          }
        } else {
          console.warn(`[collaboration] HQ document NOT FOUND at: Primary/${selectedMonth}/${selectedTeam}/${selectedHq}`);
        }
      } catch (err) {
        console.error('[collaboration] Firebase initial load error:', err);
      } finally {
        isInitialLoad = false;
      }

      const yarray = docInstance.getArray('data');
      const syncData = () => setData([...yarray.toArray()]);
      yarray.observe(syncData);
      syncData();

      setYdoc(docInstance);

      // Presence
      provider.awareness.on('change', () => {
        setPeers(provider.awareness.getStates().size);
      });

      // Status
      provider.on('status', (event) => {
        setStatus(event.status === 'connected' ? `Online: ${selectedHq}` : 'Connecting...');
      });

      // Cloud Relay Save
      docInstance.on('update', async (update, origin) => {
        if (isInitialLoad || origin === 'cloud-relay') return;
        const state = Y.encodeStateAsUpdate(docInstance);
        try {
          await setDoc(hqRef, {
            hq: selectedHq,
            sales_team: selectedTeam,
            hqUpdate: Bytes.fromUint8Array(state),
            last_updated: new Date().toISOString()
          }, { merge: true });

          // Keep month metadata alive
          await setDoc(doc(db, 'Primary', selectedMonth), {
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error('Error syncing to Firebase:', e);
        }
      });

      // Cloud Relay Load (Listen)
      const unsubHq = onSnapshot(hqRef, (snapshot) => {
        if (isInitialLoad) return;
        const data = snapshot.data();
        if (data && data.hqUpdate) {
          try {
            Y.applyUpdate(docInstance, data.hqUpdate.toUint8Array(), 'cloud-relay');
          } catch (e) {
            console.error('Cloud relay error:', e);
          }
        }
      });

      cleanup = () => {
        yarray.unobserve(syncData);
        unsubHq();
        provider.destroy();
        persistence.destroy();
        docInstance.destroy();
      };
    };

    setup();
    return () => { if (cleanup) cleanup(); };
  }, [selectedMonth, selectedTeam, selectedHq]);

  // Actions
  const addRow = useCallback((newItem) => {
    if (!ydoc) return;
    ydoc.getArray('data').push([newItem]);
  }, [ydoc]);

  const deleteRow = useCallback((item) => {
    if (!ydoc) return;
    const yarray = ydoc.getArray('data');
    const arrayData = yarray.toArray();
    const index = arrayData.findIndex(i => i.invoice_no === item.invoice_no);
    if (index > -1) yarray.delete(index, 1);
  }, [ydoc]);

  const createTeam = useCallback(async (name) => {
    if (!name) return;
    try {
      const monthRef = doc(db, 'Primary', selectedMonth);
      await setDoc(monthRef, { teams: arrayUnion(name) }, { merge: true });
      await refreshTeams();
    } catch (e) {
      console.error("Error creating team:", e);
    }
  }, [selectedMonth, refreshTeams]);

  const createHq = useCallback(async (name) => {
    if (!selectedTeam || !name) return;
    const hqRef = doc(db, 'Primary', selectedMonth, selectedTeam, name);
    
    // Scoped initialization for HQ creation
    const tempDoc = new Y.Doc();
    tempDoc.getArray('data').push([{
      customer: "System",
      item_name: `HQ ${name} created`,
      qty: 0,
      value: 0,
      invoice_no: `INIT-HQ-${Date.now()}`,
      posting_date: new Date().toISOString().split('T')[0],
      sales_team: selectedTeam,
      hq: name
    }]);

    const state = Y.encodeStateAsUpdate(tempDoc);
    await setDoc(hqRef, {
      hq: name,
      sales_team: selectedTeam,
      hqUpdate: Bytes.fromUint8Array(state),
      last_updated: new Date().toISOString()
    });

    await refreshHqs();
    tempDoc.destroy();
  }, [selectedMonth, selectedTeam, refreshHqs]);

  return {
    data,
    availableTeams,
    availableHqs,
    selection: {
      month: selectedMonth,
      team: selectedTeam,
      hq: selectedHq
    },
    status,
    peers,
    actions: {
      setMonth: (m) => { setSelectedMonth(m); setSelectedTeam(null); setSelectedHq(null); },
      setTeam: (t) => { setSelectedTeam(t); setSelectedHq(null); },
      setHq: (h) => { setSelectedHq(h); },
      addRow,
      deleteRow,
      createTeam,
      createHq
    }
  };
};

