import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { startBackgroundUpdate, stopBackgroundUpdate } from '../services/LocationTask';
import { getDB } from '../services/db';

const INACTIVITY_WARNING_MS = 45 * 60 * 1000; // 45 mins
const INACTIVITY_CLOSE_MS = 50 * 60 * 1000; // 5 mins after warning

export const useTracking = (isTrackingActive: boolean, onAutoClose?: () => void) => {
    const [tracking, setTracking] = useState(false);
    const checkInterval = useRef<NodeJS.Timeout | null>(null);

    // Function to start tracking
    const startTracking = async () => {
        const success = await startBackgroundUpdate();
        if (success) {
            setTracking(true);
            return true;
        }
        return false;
    };

    // Function to stop tracking
    const stopTracking = async () => {
        await stopBackgroundUpdate();
        setTracking(false);
    };

    // Check inactivity
    const checkInactivity = useCallback(async () => {
        if (!isTrackingActive) return;

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
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "Tarea Finalizada Automáticamente",
                            body: "Se ha cerrado la tarea por inactividad prolongada.",
                        },
                        trigger: null,
                    });
                    if (onAutoClose) onAutoClose();
                    await stopTracking();
                } else if (diff > INACTIVITY_WARNING_MS) {
                    // Warning
                    // Check if we already warned recently? For now just warn.
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "Advertencia de Inactividad",
                            body: "No se ha detectado movimiento en 45 minutos. La tarea se cerrará pronto.",
                            sound: true,
                            priority: Notifications.AndroidNotificationPriority.HIGH,
                        },
                        trigger: null,
                    });
                }
            }
        } catch (e) {
            console.error("Error checking inactivity", e);
        }
    }, [isTrackingActive, onAutoClose]);

    // Effect to run inactivity check interval
    useEffect(() => {
        if (isTrackingActive) {
            checkInterval.current = setInterval(checkInactivity, 5 * 60 * 1000); // Check every 5 mins
            // Also check immediately?
        } else {
            if (checkInterval.current) clearInterval(checkInterval.current);
        }

        return () => {
            if (checkInterval.current) clearInterval(checkInterval.current);
        };
    }, [isTrackingActive, checkInactivity]);

    return {
        startTracking,
        stopTracking,
        isTracking: tracking
    };
};
