import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
// import * as Notifications from 'expo-notifications';
import { startBackgroundUpdate, stopBackgroundUpdate } from '../services/LocationTask';
import { getDB } from '../services/db';

const INACTIVITY_WARNING_MS = 45 * 60 * 1000; // 45 mins
const INACTIVITY_CLOSE_MS = 50 * 60 * 1000; // 5 mins after warning

interface TrackingContextType {
    isTracking: boolean;
    startTracking: (taskId: string) => Promise<boolean>;
    stopTracking: () => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType>({
    isTracking: false,
    startTracking: async () => false,
    stopTracking: async () => { },
});

export const useTracking = () => useContext(TrackingContext);

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
    const [isTracking, setIsTracking] = useState(false);
    const checkInterval = useRef<NodeJS.Timeout | null>(null);

    const startTracking = async (taskId: string) => {
        console.log('[TrackingContext] Starting tracking for task:', taskId);

        // Persist active task ID
        const { setActiveTaskId } = require('../services/db');
        await setActiveTaskId(taskId);

        const success = await startBackgroundUpdate();
        if (success) {
            setIsTracking(true);
            return true;
        }
        return false;
    };

    const stopTracking = async () => {
        console.log('[TrackingContext] Stopping tracking...');
        const { setActiveTaskId } = require('../services/db');
        await setActiveTaskId(null); // Clear active task

        await stopBackgroundUpdate();
        setIsTracking(false);
    };

    // Check inactivity
    const checkInactivity = useCallback(async () => {
        if (!isTracking) return;

        try {
            const db = await getDB();
            // Get last point
            const lastPoint = await db.getFirstAsync<{ timestamp: number }>('SELECT timestamp FROM tracking_points ORDER BY timestamp DESC LIMIT 1');

            if (lastPoint) {
                const now = Date.now();
                const diff = now - lastPoint.timestamp;

                console.log(`[Tracking] Inactivity check: ${diff / 1000 / 60} min since last movement`);

                if (diff > INACTIVITY_CLOSE_MS) {
                    // Trigger Auto Close
                    console.log('[Tracking] Auto-closing due to inactivity');
                    // Notifications.scheduleNotificationAsync({ ... }) // Disabled for Expo Go compatibility

                    await stopTracking();
                    // Ideally we should also update the TASK status in the API, but context doesn't know about specific task ID here easily without more state.
                    // For now, we stop tracking. The user will see it stopped.

                } else if (diff > INACTIVITY_WARNING_MS) {
                    /*
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "Advertencia de Inactividad",
                            body: "No se ha detectado movimiento en 45 minutos. La tarea se cerrará pronto.",
                            sound: true,
                            priority: Notifications.AndroidNotificationPriority.HIGH,
                        },
                        trigger: null,
                    });
                    */
                    console.log('[Tracking] Warning: Inactivity detected (Notification disabled in Expo Go)');
                }
            } else {
                // No points yet? Maybe just started. Ignore.
            }
        } catch (e) {
            console.error("Error checking inactivity", e);
        }
    }, [isTracking]);

    useEffect(() => {
        // Sync Interval (every 2 minutes)
        const syncInterval = setInterval(() => {
            import('../services/SyncService').then(mod => mod.syncAll());
        }, 2 * 60 * 1000);

        // Also sync on mount/startup
        import('../services/SyncService').then(mod => mod.syncAll());

        if (isTracking) {
            // Check inactivity every 5 mins
            checkInterval.current = setInterval(checkInactivity, 5 * 60 * 1000);
        } else {
            if (checkInterval.current) clearInterval(checkInterval.current);
        }
        return () => {
            if (checkInterval.current) clearInterval(checkInterval.current);
            clearInterval(syncInterval);
        };
    }, [isTracking, checkInactivity]);

    return (
        <TrackingContext.Provider value={{ isTracking, startTracking, stopTracking }}>
            {children}
        </TrackingContext.Provider>
    );
};
