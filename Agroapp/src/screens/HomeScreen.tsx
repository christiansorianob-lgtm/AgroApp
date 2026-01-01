import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { getPendingSubmissions } from '../services/db';
import { API_BASE } from '../config';

const API_URL = `${API_BASE}/tareas`;

interface HomeScreenProps {
    user: any;
    onLogout: () => void;
    onSelectTask: (task: any) => void;
}

interface Tarea {
    id: string;
    tipo: string;
    finca: { nombre: string };
    lote?: { nombre: string };
    fechaProgramada: string;
    estado: "PROGRAMADA" | "EN_PROCESO" | "EJECUTADA" | "CANCELADA";
    prioridad: string;
}

export default function HomeScreen({ user, onLogout, onSelectTask }: HomeScreenProps) {
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // View State: 'PENDING' vs 'HISTORY'
    const [viewMode, setViewMode] = useState<'PENDING' | 'HISTORY'>('PENDING');

    const fetchTasks = useCallback(async () => {
        try {
            // console.log("Fetching tasks for:", user.id);
            const response = await fetch(`${API_URL}?responsableId=${user.id}`);
            const json = await response.json();

            if (response.ok) {
                let serverTasks: Tarea[] = json.data;

                // MERGE OFFLINE STATUS
                try {
                    const pendingSubmissions = await getPendingSubmissions();
                    const pendingIds = new Set(pendingSubmissions.map(p => p.taskId));

                    if (pendingIds.size > 0) {
                        serverTasks = serverTasks.map(t => {
                            if (pendingIds.has(t.id)) {
                                console.log('[HomeScreen] Task found in offline queue:', t.id);
                                return { ...t, estado: 'EJECUTADA' };
                            }
                            return t;
                        });
                    }
                } catch (e) {
                    console.warn('[HomeScreen] Failed to check offline queue', e);
                }

                setTasks(serverTasks);
            } else {
                console.warn("Error fetching tasks:", json.error);
                Alert.alert("Error", "No se pudieron cargar las tareas.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Verifique su conexión.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Change Password State
    const [modalVisible, setModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks();
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Todos los campos son obligatorios");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "las contraseñas nuevas no coinciden");
            return;
        }

        setChangingPassword(true);
        try {
            // Replace IP with local IP or config
            const response = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert("Éxito", "Contraseña actualizada correctamente");
                setModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Alert.alert("Error", data.error || "No se pudo actualizar la contraseña");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Error de conexión");
        } finally {
            setChangingPassword(false);
        }
    };

    // Filter tasks based on view mode
    const filteredTasks = tasks.filter(t => {
        if (viewMode === 'PENDING') {
            return t.estado !== 'EJECUTADA' && t.estado !== 'CANCELADA';
        } else {
            return t.estado === 'EJECUTADA' || t.estado === 'CANCELADA';
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PROGRAMADA': return '#3b82f6'; // blue
            case 'EN_PROCESO': return '#f59e0b'; // orange
            case 'EJECUTADA': return '#10b981'; // green
            case 'CANCELADA': return '#ef4444'; // red
            default: return '#6b7280';
        }
    };

    const renderItem = ({ item }: { item: Tarea }) => (
        <TouchableOpacity onPress={() => onSelectTask(item)} activeOpacity={0.7}>
            <View style={[styles.card, item.estado === 'EN_PROCESO' && styles.activeCardBorder]}>
                <View style={styles.cardHeader}>
                    <View style={styles.badges}>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(item.estado) }]}>
                            <Text style={styles.badgeText}>{item.estado.replace('_', ' ')}</Text>
                        </View>
                        <Text style={styles.date}>{new Date(item.fechaProgramada).toLocaleDateString()}</Text>
                    </View>

                    {/* Active Task Indicator */}
                    {item.estado === 'EN_PROCESO' && (
                        <View style={styles.activeIndicatorContainer}>
                            <PulseIcon />
                            <DashboardTimer startDate={(item as any).fechaInicioReal} />
                        </View>
                    )}

                    {item.estado !== 'EN_PROCESO' && (
                        <Feather name="chevron-right" size={20} color="#9ca3af" />
                    )}
                </View>

                <Text style={styles.taskTitle}>{item.tipo}</Text>

                <View style={styles.locationContainer}>
                    <Feather name="map-pin" size={14} color="#6b7280" />
                    <Text style={styles.locationText}>
                        {item.finca.nombre} {item.lote ? `- ${item.lote.nombre}` : ''}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // ---------------------------------------------------------------------
    // Helper Components
    // ---------------------------------------------------------------------

    function PulseIcon() {
        const opacity = useRef(new Animated.Value(0.3)).current;

        useEffect(() => {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.3,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        }, [opacity]);

        return (
            <View style={styles.ledContainer}>
                {/* Glow Layer */}
                <Animated.View style={[styles.ledGlow, { opacity }]} />
                {/* Core LED */}
                <View style={styles.ledCore} />
            </View>
        );
    }

    function DashboardTimer({ startDate }: { startDate: string }) {
        const [elapsed, setElapsed] = useState("");

        useEffect(() => {
            if (!startDate) return;
            const start = new Date(startDate).getTime();
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const diff = now - start;
                if (diff >= 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setElapsed(`${hours}h ${minutes}m`);
                }
            }, 1000); // Update every sec
            return () => clearInterval(interval);
        }, [startDate]);

        return (
            <Text style={styles.timerText}>{elapsed || "0h 0m"}</Text>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hola, {user.nombre.split(' ')[0]}</Text>
                    <Text style={styles.role}>{user.cargo}</Text>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
                        <Feather name="lock" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
                        <Feather name="log-out" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {viewMode === 'PENDING' ? 'Tareas Pendientes' : 'Historial Ejecutado'}
                    </Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{filteredTasks.length}</Text>
                    </View>
                </View>

                <FlatList
                    data={filteredTasks}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyState}>
                                <Feather name="check-circle" size={48} color="#d1d5db" />
                                <Text style={styles.emptyText}>
                                    {viewMode === 'PENDING' ? 'No tienes tareas pendientes' : 'No hay historial reciente'}
                                </Text>
                            </View>
                        ) : null
                    }
                />

                {/* View Switcher Footer */}
                <View style={styles.footerFilter}>
                    <TouchableOpacity
                        style={[styles.filterBtn, viewMode === 'PENDING' && styles.filterBtnActive]}
                        onPress={() => setViewMode('PENDING')}
                    >
                        <Text style={[styles.filterText, viewMode === 'PENDING' && styles.filterTextActive]}>Pendientes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, viewMode === 'HISTORY' && styles.filterBtnActive]}
                        onPress={() => setViewMode('HISTORY')}
                    >
                        <Text style={[styles.filterText, viewMode === 'HISTORY' && styles.filterTextActive]}>Historial</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Change Password Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Feather name="x" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Contraseña Actual</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="******"
                            />

                            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="******"
                            />

                            <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
                            <TextInput
                                style={styles.input}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="******"
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, changingPassword && styles.buttonDisabled]}
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                            >
                                <Text style={styles.saveButtonText}>
                                    {changingPassword ? "Actualizando..." : "Guardar Nueva Contraseña"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#16a34a',
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    role: {
        fontSize: 14,
        color: '#dcfce7', // green-100
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalBody: {
        gap: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: -8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#16a34a',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    content: {
        flex: 1,
        paddingTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginRight: 8,
    },
    countBadge: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    badges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    date: {
        fontSize: 12,
        color: '#6b7280',
    },

    /* Active Task Styles */
    activeCardBorder: {
        borderColor: '#f59e0b',
        borderWidth: 1,
        backgroundColor: '#fffbeb' // warm bg
    },
    activeIndicatorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50
    },
    ledContainer: {
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    ledGlow: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.4)', // Red/Amber Glow
    },
    ledCore: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444', // Red LED
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)', // Glass effect
        shadowColor: '#ef4444',
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4
    },
    timerText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b91c1c', // red-700
    },

    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#6b7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
    },
    footerFilter: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 12,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    filterBtnActive: {
        backgroundColor: '#dcfce7',
    },
    filterText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#16a34a',
    }
});

