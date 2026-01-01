import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { insertPoint, initTrackingDB } from './db';

const LOCATION_TASK_NAME = 'BACKGROUND_GPS_TRACKING';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location Task Error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };

        // Initialize DB if not ready (might happen in background)
        try {
            await initTrackingDB();
        } catch (e) {
            console.error("Error initializing DB in background task", e);
            return; // Exit safely
        }

        for (const location of locations) {
            const { latitude, longitude, accuracy } = location.coords;
            const timestamp = location.timestamp;

            // Filter: Accuracy < 100 meters (Relaxed to ensure data capture)
            if (accuracy && accuracy < 100) {
                // Get Battery Level
                const batteryLevel = await Battery.getBatteryLevelAsync();

                // Save to DB (insertPoint will fetch ActiveTaskId if not provided, but we can do it here too if needed. 
                // db.ts logic handles it: let tid = point.taskId; if (!tid) tid = await getActiveTaskId();
                // So we can just call insertPoint as is, respecting the interface)

                await insertPoint({
                    latitude,
                    longitude,
                    accuracy,
                    batteryLevel,
                    timestamp,
                    // taskId will be auto-filled by db.ts from app_state
                });

                console.log(`[GPS] Point saved: ${latitude}, ${longitude} (Acc: ${accuracy}m)`);
            } else {
                console.log(`[GPS] Point discarded (Low Accuracy: ${accuracy}m): ${latitude}, ${longitude}`);
            }
        }
    }
});

export const startBackgroundUpdate = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        console.log('Foreground permission denied');
        return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        console.log('Background permission denied');
        return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5, // Filter: Move > 5 meters
        activityType: Location.ActivityType.Other,
        foregroundService: {
            notificationTitle: "AgroApp Tracking",
            notificationBody: "Registrando trazabilidad de la tarea...",
            notificationColor: "#4CAF50",
        },
        showsBackgroundLocationIndicator: true, // iOS indicator
        pausesUpdatesAutomatically: false, // Prevent auto-pause
    });

    return true;
};

export const stopBackgroundUpdate = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
};
