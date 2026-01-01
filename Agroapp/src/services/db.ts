import * as SQLite from 'expo-sqlite';

export interface TrackingPoint {
    id?: number;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    batteryLevel: number;
    timestamp: number;
    taskId?: string;
    synced: number; // 0 = false, 1 = true
}

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
    if (db) return db;
    try {
        db = await SQLite.openDatabaseAsync('agroapp_tracking.db');
        return db;
    } catch (e) {
        console.error("Failed to open DB", e);
        throw e;
    }
};

export const initTrackingDB = async () => {
    const database = await getDB();
    await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tracking_points_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      batteryLevel REAL,
      timestamp INTEGER NOT NULL,
      taskId TEXT,
      synced INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

    // Ensure this is run separately to avoid migration issues on existing DBs
    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `);
};

export const addPendingSubmission = async (taskId: string, payload: any) => {
    try {
        const database = await getDB();
        await database.runAsync(
            'INSERT INTO pending_submissions (taskId, payload, timestamp) VALUES (?, ?, ?)',
            taskId,
            JSON.stringify(payload),
            Date.now()
        );
    } catch (error: any) {
        if (error.message && error.message.includes('no such table')) {
            console.warn('[DB] pending_submissions table missing. Initializing and retrying...');
            try {
                await initTrackingDB();
                const database = await getDB();
                await database.runAsync(
                    'INSERT INTO pending_submissions (taskId, payload, timestamp) VALUES (?, ?, ?)',
                    taskId,
                    JSON.stringify(payload),
                    Date.now()
                );
            } catch (retryError) {
                console.error('[DB] Failed to create table or insert on retry', retryError);
            }
        } else {
            console.error('[DB] Custom Error adding pending submission', error);
        }
    }
};

export const getPendingSubmissions = async () => {
    try {
        const database = await getDB();
        const result = await database.getAllAsync<{ id: number; taskId: string; payload: string; timestamp: number }>(
            'SELECT * FROM pending_submissions ORDER BY timestamp ASC'
        );
        return result.map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }));
    } catch (error: any) {
        if (error.message && error.message.includes('no such table')) {
            console.warn('[DB] pending_submissions table missing. Skipping read.');
            return [];
        }
        throw error;
    }
};

export const removePendingSubmission = async (id: number) => {
    const database = await getDB();
    await database.runAsync('DELETE FROM pending_submissions WHERE id = ?', id);
};

export const setActiveTaskId = async (taskId: string | null) => {
    const database = await getDB();
    if (taskId) {
        await database.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', 'CURRENT_TASK_ID', taskId);
    } else {
        await database.runAsync('DELETE FROM app_state WHERE key = ?', 'CURRENT_TASK_ID');
    }
};

export const getActiveTaskId = async () => {
    const database = await getDB();
    const result = await database.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', 'CURRENT_TASK_ID');
    return result?.value || null;
};

// Generic Key-Value Storage (For Catalogs & Drafts)
// Generic Key-Value Storage (For Catalogs & Drafts)
export const setItem = async (key: string, value: string) => {
    try {
        const database = await getDB();
        await database.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', key, value);
    } catch (error: any) {
        if (error.message && error.message.includes('no such table')) {
            console.warn('[DB] app_state table missing. Initializing and retrying...');
            await initTrackingDB();
            const database = await getDB();
            await database.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', key, value);
        } else {
            throw error;
        }
    }
};

export const getItem = async (key: string) => {
    try {
        const database = await getDB();
        const result = await database.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', key);
        return result?.value || null;
    } catch (error: any) {
        if (error.message && error.message.includes('no such table')) {
            console.warn('[DB] app_state table missing (getItem). Initializing and retrying...');
            await initTrackingDB();
            const database = await getDB();
            const result = await database.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', key);
            return result?.value || null;
        }
        throw error;
    }
};

export const insertPoint = async (point: Omit<TrackingPoint, 'id' | 'synced'> & { taskId?: string }) => {
    const database = await getDB();
    // If taskId not passed, try to get from state (redundancy)
    let tid = point.taskId;
    if (!tid) {
        tid = (await getActiveTaskId()) || undefined;
    }

    // Note: If column doesn't exist (old install), this might fail. 
    // For dev, we might need a migration or catch/ignore. 
    // Assuming fresh install or re-install for this feature.

    await database.runAsync(
        'INSERT INTO tracking_points_v2 (latitude, longitude, accuracy, batteryLevel, timestamp, taskId) VALUES (?, ?, ?, ?, ?, ?)',
        point.latitude,
        point.longitude,
        point.accuracy,
        point.batteryLevel,
        point.timestamp,
        tid || null
    );
};

export const getUnsyncedPoints = async () => {
    const database = await getDB();
    return await database.getAllAsync<TrackingPoint>('SELECT * FROM tracking_points_v2 WHERE synced = 0 ORDER BY timestamp ASC');
};

export const markPointsAsSynced = async (ids: number[]) => {
    if (ids.length === 0) return;
    const database = await getDB();
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(`UPDATE tracking_points_v2 SET synced = 1 WHERE id IN (${placeholders})`, ...ids);
};

export const deleteSyncedPoints = async () => {
    const database = await getDB();
    await database.runAsync('DELETE FROM tracking_points_v2 WHERE synced = 1');
};

export const getPointCount = async () => {
    const database = await getDB();
    const result = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tracking_points_v2');
    return result?.count || 0;
};
