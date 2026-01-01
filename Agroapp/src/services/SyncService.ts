import { getUnsyncedPoints, markPointsAsSynced, deleteSyncedPoints, getPendingSubmissions, removePendingSubmission } from './db';
import * as Network from 'expo-network';
import { API_BASE } from '../config';

const SYNC_API_URL = `${API_BASE}/tracking/batch`;

export const syncPoints = async () => {
    try {
        // Check network
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected || !networkState.isInternetReachable) {
            console.log('[Sync] No internet connection. Skipping sync.');
            return;
        }

        // Get unsynced points
        const points = await getUnsyncedPoints();
        if (points.length === 0) {
            console.log('[Sync] No points to sync.');
            return;
        }

        console.log(`[Sync] Attempting to sync ${points.length} points...`);

        // Batch upload (chunk if necessary, but 2000 points is usually fine in one go or chunk by 100)
        // Here we send all for simplicity, or chunk by 50
        const CHUNK_SIZE = 50;

        for (let i = 0; i < points.length; i += CHUNK_SIZE) {
            const chunk = points.slice(i, i + CHUNK_SIZE);
            const payload = {
                points: chunk.map(p => ({
                    lat: p.latitude,
                    lng: p.longitude,
                    acc: p.accuracy,
                    batt: p.batteryLevel,
                    ts: new Date(p.timestamp).toISOString(),
                    taskId: p.taskId
                }))
            };

            try {
                const response = await fetch(SYNC_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const ids = chunk.map(p => p.id!);
                    await markPointsAsSynced(ids);
                    console.log(`[Sync] Synced batch of ${chunk.length} points.`);
                } else {
                    console.error(`[Sync] Batch failed: ${response.status}`);
                }
            } catch (err: any) {
                // Ignore network errors (common in background sync/offline)
                if (err.message && (err.message.includes('Network request failed') || err.message.includes('Network Error'))) {
                    console.log('[Sync] Network unavailable, retrying later.');
                } else {
                    console.error(`[Sync] Error during batch:`, err);
                }
            }
        }

        // Cleanup
        await deleteSyncedPoints();
        console.log('[Sync] Implementation and cleanup complete.');

    } catch (error) {
        console.log('[Sync] Global error (expected if offline):', error);
    }
};

export const syncPendingSubmissions = async () => {
    try {
        const pending = await getPendingSubmissions();
        if (pending.length === 0) return;

        console.log(`[Sync] Processing ${pending.length} pending submissions...`);

        // Ensure GPS is synced FIRST so the map trace appears correctly
        await syncPoints();

        for (const submission of pending) {
            const { id, taskId, payload: rawPayload } = submission;
            // Payload has: { ..., photos: [{uri}] }
            const data = rawPayload;

            // 1. Upload Photos
            const uploadedUrls: string[] = [];
            if (data.photos && Array.isArray(data.photos)) {
                for (const p of data.photos) {
                    try {
                        const formData = new FormData();
                        const filename = p.uri.split('/').pop() || "evidence.jpg";
                        const match = /\.(\w+)$/.exec(filename);
                        const type = match ? `image/${match[1]}` : `image/jpeg`;

                        // @ts-ignore
                        formData.append('file', { uri: p.uri, name: filename, type });

                        const uploadRes = await fetch(`${API_BASE}/tareas/${taskId}/evidence`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'multipart/form-data' },
                            body: formData,
                        });

                        if (uploadRes.ok) {
                            const json = await uploadRes.json();
                            if (json.url) {
                                // Normalize URL if needed
                                const fullUrl = json.url.startsWith('http') ? json.url : `${API_BASE.replace('/api/v1', '')}${json.url}`;
                                uploadedUrls.push(fullUrl);
                            }
                        }
                    } catch (e) {
                        console.log(`[Sync] Failed to upload photo for task ${taskId} (will retry)`, e);
                    }
                }
            }

            // 2. Submit Final Data
            const finalPayload = {
                estado: data.estado || 'EJECUTADA',
                fechaEjecucion: data.fechaEjecucion,
                observaciones: data.observaciones,
                consumos: data.consumos,
                usoMaquinaria: data.usoMaquinaria,
                evidencias: uploadedUrls.join('\n')
            };

            try {
                const response = await fetch(`${API_BASE}/tareas/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPayload),
                });

                if (response.ok) {
                    console.log(`[Sync] Task ${taskId} finalized successfully.`);
                    await removePendingSubmission(id);
                } else {
                    console.warn(`[Sync] Failed to finalize task ${taskId}: ${response.status}`);
                }
            } catch (e) {
                console.warn(`[Sync] Error submitting task ${taskId} (will retry)`, e);
            }
        }
    } catch (error) {
        console.warn('[Sync] Error processing pending submissions:', error);
    }
};

export const syncAll = async () => {
    // Run both
    const networkState = await Network.getNetworkStateAsync();
    if (networkState.isConnected && networkState.isInternetReachable) {
        await syncPoints();
        await syncPendingSubmissions();
    }
};
