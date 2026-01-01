import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, Image, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTracking } from '../context/TrackingContext';
import { captureRef } from 'react-native-view-shot';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { getItem, setItem, addPendingSubmission } from '../services/db';
import { API_BASE } from '../config';

const API_URL = API_BASE; // Base URL (should be global ideally)

interface ExecutionFormScreenProps {
    task: any;
    onBack: () => void;
    onFinish: () => void; // Called after success
}

export default function ExecutionFormScreen({ task, onBack, onFinish }: ExecutionFormScreenProps) {
    // Imports (Add these at top if missing, verify context)
    // NOTE: Ensure 'expo-network' is imported as Network
    // import * as Network from 'expo-network'; 
    // import { getItem, setItem } from '../services/db';

    const { stopTracking } = useTracking();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    // Form Data
    const [fechaEjecucion, setFechaEjecucion] = useState(new Date());
    const [observaciones, setObservaciones] = useState('');
    const [consumos, setConsumos] = useState<any[]>([]);
    const [machinery, setMachinery] = useState<any[]>([]);
    const [photos, setPhotos] = useState<any[]>([]);

    // Watermarking State
    const viewShotRef = useRef(null);
    const [processingPhoto, setProcessingPhoto] = useState<{ uri: string, meta: string } | null>(null);


    // Catalogs
    const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
    const [machineryCatalog, setMachineryCatalog] = useState<any[]>([]);

    // Load catalogs (Cache Strategy)
    useEffect(() => {
        const loadCatalogs = async () => {
            const fincaId = task.finca?.id || 'default';
            const PROD_KEY = `CATALOG_PROD_${fincaId}`;
            const MACH_KEY = `CATALOG_MACH_${fincaId}`;

            try {
                // Try Network First
                const [prodRes, maqRes] = await Promise.all([
                    fetch(`${API_URL}/almacen/productos/simple?fincaId=${task.finca?.id || ''}`),
                    fetch(`${API_URL}/maquinaria/simple?fincaId=${task.finca?.id || ''}`)
                ]);

                if (prodRes.ok && maqRes.ok) {
                    const prods = await prodRes.json();
                    const maqs = await maqRes.json();

                    if (Array.isArray(prods)) {
                        setProductsCatalog(prods);
                        await setItem(PROD_KEY, JSON.stringify(prods));
                    }
                    if (Array.isArray(maqs)) {
                        setMachineryCatalog(maqs);
                        await setItem(MACH_KEY, JSON.stringify(maqs));
                    }
                } else {
                    throw new Error("Network request failed");
                }
            } catch (error) {
                console.log("Network error loading catalogs, trying cache...", error);

                // Fallback to Cache
                const cachedProds = await getItem(PROD_KEY);
                const cachedMaqs = await getItem(MACH_KEY);

                if (cachedProds) setProductsCatalog(JSON.parse(cachedProds));
                if (cachedMaqs) setMachineryCatalog(JSON.parse(cachedMaqs));

                if (!cachedProds && !cachedMaqs) {
                    Alert.alert("Aviso Offline", "No hay catálogos guardados. Necesitas internet para cargarlos por primera vez.");
                } else {
                    // Alert.alert("Modo Offline", "Usando catálogos guardados."); // Optional feedback
                }
            }
        };
        loadCatalogs();
    }, [task]);

    // Draft Key
    const DRAFT_KEY = `DRAFT_TASK_${task.id}`;

    // Load Draft on Mount
    useEffect(() => {
        const loadDraft = async () => {
            const draftJson = await getItem(DRAFT_KEY);
            if (draftJson) {
                try {
                    const draft = JSON.parse(draftJson);
                    if (draft.observaciones) setObservaciones(draft.observaciones);
                    if (draft.consumos) setConsumos(draft.consumos);
                    if (draft.machinery) setMachinery(draft.machinery);
                    if (draft.photos) setPhotos(draft.photos); // Local URIs should persist usually
                    // Date usually reset to current execution time, but could restore if needed
                    console.log("Draft loaded for task", task.id);
                } catch (e) {
                    console.error("Error loading draft", e);
                }
            }
        };
        loadDraft();
    }, [task.id]);

    // Save Draft on Change (Debounced ideally, but simple effect here)
    useEffect(() => {
        const saveDraft = async () => {
            const draft = {
                observaciones,
                consumos,
                machinery,
                photos,
                updatedAt: Date.now()
            };
            await setItem(DRAFT_KEY, JSON.stringify(draft));
        };

        // Save only if there's some data content to avoid overwriting with empty on initial render race conditions
        if (observaciones || consumos.length > 0 || machinery.length > 0 || photos.length > 0) {
            const timer = setTimeout(saveDraft, 1000); // Debounce 1s
            return () => clearTimeout(timer);
        }
    }, [observaciones, consumos, machinery, photos, task.id]);


    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'PRODUCT' | 'MACHINERY'>('PRODUCT');
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const openSelector = (type: 'PRODUCT' | 'MACHINERY', index: number) => {
        setModalType(type);
        setActiveIndex(index);
        setModalVisible(true);
    };

    const handleSelect = (item: any) => {
        if (modalType === 'PRODUCT') {
            const newC = [...consumos];
            newC[activeIndex].productoId = item.id;
            newC[activeIndex].label = item.nombre; // Store label for display
            newC[activeIndex].stock = item.stockActual;
            newC[activeIndex].unidad = item.unidadMedida;
            setConsumos(newC);
        } else {
            const newM = [...machinery];
            newM[activeIndex].maquinariaId = item.id;
            newM[activeIndex].label = item.label; // Pre-formatted label from API
            setMachinery(newM);
        }
        setModalVisible(false);
    };

    const handleAddConsumo = () => {
        setConsumos([...consumos, { productoId: '', cantidad: '', label: '' }]);
    };

    const handleAddMachinery = () => {
        setMachinery([...machinery, { maquinariaId: '', horas: '', label: '' }]);
    };

    // Modified Take Photo Logic
    const takePhoto = async () => {
        try {
            // Check Permissions
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            console.log("Camera Permission:", permission);

            if (!permission.granted) {
                Alert.alert(
                    `Permiso: ${permission.status}`,
                    "Se requiere acceso a la cámara. Ve a Configuración > Aplicaciones > AgroApp y actívalo."
                );
                return;
            }

            // 1. Get Location (Optional - Don't block camera)
            let locationText = "GPS: No Data";
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    locationText = `LAT: ${loc.coords.latitude.toFixed(6)} | LNG: ${loc.coords.longitude.toFixed(6)}`;
                } else {
                    console.log("Location permission not granted for photo metadata");
                }
            } catch (e) {
                console.log("Error getting location for photo (ignoring)", e);
            }
            const dateText = new Date().toLocaleString();
            const meta = `${dateText}\n${locationText}`;

            // 2. Launch Camera
            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // Explicitly set media type
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                // 3. Trigger processing
                setSubmitting(true); // Block UI
                setProcessingPhoto({ uri: result.assets[0].uri, meta });
            }
        } catch (err: any) {
            console.error("Camera Error:", err);
            Alert.alert("Error de Cámara", err?.message || String(err));
            setSubmitting(false);
        }
    };

    // Effect to process watermark
    useEffect(() => {
        if (processingPhoto && viewShotRef.current) {
            const process = async () => {
                try {
                    // Small delay to ensure render
                    await new Promise(r => setTimeout(r, 500));

                    const uri = await captureRef(viewShotRef, {
                        format: "jpg",
                        quality: 0.8,
                        result: "tmpfile"
                    });

                    // Add to photos
                    setPhotos(prev => [...prev, { uri }]);
                } catch (e) {
                    console.error("Watermark failed", e);
                    Alert.alert("Error", "Falló el procesamiento de la marca de agua");
                } finally {
                    setProcessingPhoto(null);
                    setSubmitting(false);
                }
            };
            process();
        }
    }, [processingPhoto]);


    const handleSubmit = async () => {
        // Validate
        if (!observaciones.trim()) {
            Alert.alert("Requerido", "Por favor ingresa observaciones del trabajo.");
            return;
        }

        // Clean arrays
        const cleanConsumos = consumos.filter(c => c.productoId && c.cantidad);
        const cleanMachinery = machinery.filter(m => m.maquinariaId && m.horas);

        setSubmitting(true);

        try {
            // Check Network
            const network = await Network.getNetworkStateAsync();
            const isConnected = network.isConnected && network.isInternetReachable;

            if (!isConnected) {
                // OFFLINE FLOW
                const offlinePayload = {
                    estado: 'EJECUTADA',
                    fechaEjecucion: fechaEjecucion.toISOString(),
                    observaciones,
                    consumos: cleanConsumos,
                    usoMaquinaria: cleanMachinery,
                    photos: photos // Store local URIs
                };

                await addPendingSubmission(task.id, offlinePayload);

                await stopTracking();
                await setItem(DRAFT_KEY, "");

                Alert.alert("Guardado Offline", "La tarea se ha guardado en el dispositivo. Se sincronizará automáticamente cuando tengas internet.");
                onFinish();
                return;
            }

            // ONLINE FLOW
            // 1. Upload Photos sequentially
            const uploadedUrls: string[] = [];
            let uploadFailed = false;

            for (const p of photos) {
                try {
                    const formData = new FormData();
                    const filename = p.uri.split('/').pop() || "evidence.jpg";
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    // @ts-ignore
                    formData.append('file', { uri: p.uri, name: filename, type });

                    const uploadRes = await fetch(`${API_URL}/tareas/${task.id}/evidence`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'multipart/form-data' },
                        body: formData,
                    });

                    if (uploadRes.ok) {
                        const json = await uploadRes.json();
                        if (json.url) {
                            const fullUrl = json.url.startsWith('http') ? json.url : `${API_URL.replace('/api/v1', '')}${json.url}`;
                            uploadedUrls.push(fullUrl);
                        } else {
                            uploadFailed = true;
                        }
                    } else {
                        console.error("Failed to upload photo", p.uri);
                        uploadFailed = true;
                    }
                } catch (e) {
                    console.error("Error uploading photo", e);
                    uploadFailed = true;
                }
            }

            // Fallback to Offline if ANY photo failed
            if (uploadFailed) {
                const offlinePayload = {
                    estado: 'EJECUTADA',
                    fechaEjecucion: fechaEjecucion.toISOString(),
                    observaciones,
                    consumos: cleanConsumos,
                    usoMaquinaria: cleanMachinery,
                    photos: photos // Store local URIs
                };

                await addPendingSubmission(task.id, offlinePayload);

                await stopTracking();
                await setItem(DRAFT_KEY, "");

                Alert.alert("Conexión Inestable", "Algunas fotos no pudieron subirse. La tarea se ha guardado en el dispositivo y se reintentará automáticamente.");
                onFinish();
                return;
            }

            // 2. Submit Final Data (Only if all photos uploaded or none existed)
            const payload = {
                estado: 'EJECUTADA',
                fechaEjecucion: fechaEjecucion.toISOString(),
                observaciones,
                consumos: cleanConsumos,
                usoMaquinaria: cleanMachinery,
                evidencias: uploadedUrls.join('\n')
            };

            const response = await fetch(`${API_URL}/tareas/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (response.ok) {
                await stopTracking(); // Stop GPS tracking
                await setItem(DRAFT_KEY, "");

                Alert.alert("Éxito", "Tarea finalizada correctamente.");
                onFinish();
            } else {
                Alert.alert("Error", json.error || "No se pudo finalizar");
            }
        } catch (error: any) {
            console.log("Submission failed, attempting offline save:", error);

            // FALLBACK TO OFFLINE SAVE
            // This handles cases where Network check said OK but request failed (timeout/dns)
            try {
                const offlinePayload = {
                    estado: 'EJECUTADA',
                    fechaEjecucion: fechaEjecucion.toISOString(),
                    observaciones,
                    consumos: cleanConsumos,
                    usoMaquinaria: cleanMachinery,
                    photos: photos // Store local URIs
                };

                await addPendingSubmission(task.id, offlinePayload);
                await stopTracking();
                await setItem(DRAFT_KEY, "");

                Alert.alert(
                    "Conexión Interrumpida",
                    "No se pudo contactar al servidor, pero la tarea se guardó en el dispositivo.\n\nSe subirá automáticamente cuando recuperes la conexión."
                );
                onFinish();
            } catch (saveError) {
                console.error("Critical Error saving offline:", saveError);
                Alert.alert("Error Crítico", "No se pudo guardar la tarea ni localmente. Intente de nuevo.");
            }
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Finalizar Tarea</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Hidden Processing View for Watermark */}
            {processingPhoto && (
                <View
                    style={{ position: 'absolute', left: -9999, top: 0 }}
                >
                    <View
                        ref={viewShotRef}
                        collapsable={false}
                        style={{ width: 600, height: 800, backgroundColor: 'black' }}
                    >
                        <Image
                            source={{ uri: processingPhoto.uri }}
                            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                        />
                        <View style={{
                            position: 'absolute', bottom: 20, right: 20,
                            backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8
                        }}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>
                                {processingPhoto.meta}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <ScrollView style={styles.content}>
                {/* Details */}
                <Text style={styles.label}>Fecha de Ejecución</Text>
                <View style={[styles.inputContainer, { backgroundColor: '#f3f4f6' }]}>
                    <Text style={[styles.textValue, { color: '#6b7280' }]}>
                        {fechaEjecucion.toLocaleDateString()} {fechaEjecucion.toLocaleTimeString()}
                    </Text>
                </View>

                {/* Observaciones */}
                <Text style={styles.label}>Desarrollo y Observaciones *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe el trabajo realizado..."
                    value={observaciones}
                    onChangeText={setObservaciones}
                />

                {/* Consumos */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Insumos Utilizados</Text>
                    <TouchableOpacity onPress={handleAddConsumo}>
                        <View style={styles.addBtnContainer}>
                            <Feather name="plus" size={16} color="#16a34a" />
                            <Text style={styles.addButton}>Agregar Insumo</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                {consumos.map((item, index) => (
                    <View key={index} style={styles.cardItem}>
                        <View style={styles.rowItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Producto:</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => openSelector('PRODUCT', index)}
                                >
                                    <Text style={item.label ? styles.selectorText : styles.placeholderText}>
                                        {item.label || "Seleccione..."}
                                    </Text>
                                    <Feather name="chevron-down" size={16} color="#9ca3af" />
                                </TouchableOpacity>
                                {item.label ? (
                                    <Text style={styles.helperText}>
                                        Stock: {item.stock} {item.unidad}
                                    </Text>
                                ) : null}
                            </View>

                            <View style={{ width: 100 }}>
                                <Text style={styles.fieldLabel}>Cantidad:</Text>
                                <TextInput
                                    style={styles.inputSmall}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={item.cantidad}
                                    onChangeText={t => {
                                        const newC = [...consumos];
                                        newC[index].cantidad = t;
                                        setConsumos(newC);
                                    }}
                                />
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => {
                            const newC = [...consumos]; newC.splice(index, 1); setConsumos(newC);
                        }} style={styles.removeBtn}>
                            <Feather name="trash-2" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                ))}
                {consumos.length === 0 && <Text style={styles.emptyText}>No hay insumos registrados.</Text>}


                {/* Maquinaria */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Maquinaria Utilizada</Text>
                    <TouchableOpacity onPress={handleAddMachinery}>
                        <View style={styles.addBtnContainer}>
                            <Feather name="plus" size={16} color="#16a34a" />
                            <Text style={styles.addButton}>Agregar Máquina</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                {machinery.map((item, index) => (
                    <View key={index} style={styles.cardItem}>
                        <View style={styles.rowItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Máquina:</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => openSelector('MACHINERY', index)}
                                >
                                    <Text style={item.label ? styles.selectorText : styles.placeholderText}>
                                        {item.label || "Seleccione..."}
                                    </Text>
                                    <Feather name="chevron-down" size={16} color="#9ca3af" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ width: 100 }}>
                                <Text style={styles.fieldLabel}>Horas:</Text>
                                <TextInput
                                    style={styles.inputSmall}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={item.horas}
                                    onChangeText={t => {
                                        const newM = [...machinery];
                                        newM[index].horas = t;
                                        setMachinery(newM);
                                    }}
                                />
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => {
                            const newM = [...machinery]; newM.splice(index, 1); setMachinery(newM);
                        }} style={styles.removeBtn}>
                            <Feather name="trash-2" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                ))}
                {machinery.length === 0 && <Text style={styles.emptyText}>No hay maquinaria registrada.</Text>}

                {/* Photos */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Registro Fotográfico (Cámara Oblogatoria)</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {/* Gallery option removed */}
                        <TouchableOpacity onPress={takePhoto}><Text style={styles.addButton}>Abrir Cámara</Text></TouchableOpacity>
                    </View>
                </View>
                <ScrollView horizontal style={styles.photoList}>
                    {photos.map((p, i) => (
                        <Image key={i} source={{ uri: p.uri }} style={styles.thumb} />
                    ))}
                </ScrollView>

                <View style={{ height: 40 }} />

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.disabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Guardar Ejecución</Text>}
                </TouchableOpacity>

                <View style={{ height: 60 }} />
            </ScrollView>

            {/* Selection Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {modalType === 'PRODUCT' ? 'Seleccionar Producto' : 'Seleccionar Maquinaria'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Feather name="x" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={modalType === 'PRODUCT' ? productsCatalog : machineryCatalog}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item)}>
                                    <Text style={styles.modalItemText}>
                                        {modalType === 'PRODUCT' ? item.nombre : item.label}
                                    </Text>
                                    {modalType === 'PRODUCT' && (
                                        <Text style={styles.modalItemSub}>Stock: {item.stockActual} {item.unidadMedida}</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyList}>No hay opciones disponibles.</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        backgroundColor: '#16a34a', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    backButton: { padding: 4 },
    content: { padding: 20 },
    label: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' },
    inputContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, borderColor: '#e5e7eb', borderWidth: 1 },
    textValue: { fontSize: 16, color: '#1f2937' },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderColor: '#d1d5db', borderWidth: 1, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top', marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    addButton: { color: '#16a34a', fontWeight: 'bold' },
    rowItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    cardItem: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    fieldLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: '600' },
    helperText: { fontSize: 11, color: '#16a34a', marginTop: 2 },
    selector: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#1f2937', fontSize: 14 },
    placeholderText: { color: '#9ca3af', fontSize: 14 },
    addBtnContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    removeBtn: { alignSelf: 'center', padding: 4 },

    inputSmall: { backgroundColor: '#fff', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db', textAlign: 'center' },
    emptyText: { color: '#9ca3af', fontStyle: 'italic', marginBottom: 16, textAlign: 'center' },

    photoList: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#ddd' },
    submitButton: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    disabled: { opacity: 0.7 },
    submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    modalItemText: { fontSize: 16, color: '#374151', marginBottom: 4 },
    modalItemSub: { fontSize: 12, color: '#6b7280' },
    emptyList: { textAlign: 'center', padding: 20, color: '#9ca3af' }
});
