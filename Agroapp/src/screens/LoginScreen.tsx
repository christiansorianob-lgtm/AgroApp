import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { API_BASE } from '../config';

const API_URL = `${API_BASE}/auth/login`;

interface LoginScreenProps {
    onLogin: (user: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!phone.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu número de celular');
            return;
        }
        if (!password.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu contraseña');
            return;
        }

        setLoading(true);
        try {
            console.log("Connecting to:", API_URL);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone.trim(),
                    password: password.trim()
                }),
            });

            console.log("Response status:", response.status);
            const responseText = await response.text();
            console.log("Response body:", responseText);

            try {
                // Determine if the response is JSON before parsing
                const contentType = response.headers.get("content-type");
                let data;
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = JSON.parse(responseText);
                } else if (responseText.trim().startsWith("{") || responseText.trim().startsWith("[")) {
                    // Fallback check if header is missing but body looks like JSON
                    data = JSON.parse(responseText);
                }

                if (response.ok) {
                    if (data && data.user) {
                        onLogin(data.user);
                    } else {
                        // Should not happen if protocol is correct, but handling it is safe
                        console.log("Login successful but no user data found", data);
                        Alert.alert('Error', 'Respuesta inesperada del servidor');
                    }
                } else {
                    // Try to get error message from data if it exists, otherwise use status text
                    const errorMessage = data?.error || `Error ${response.status}: ${responseText.slice(0, 100)}`;
                    Alert.alert('Error', errorMessage);
                }
            } catch (e) {
                console.error("JSON Parse Error:", e);
                console.log("Raw Response causing error:", responseText);
                // Show the start of the response so the user can see if it's HTML (E.g. <!DOCTYPE html>...)
                const snippet = responseText.slice(0, 200);
                Alert.alert(
                    'Error del Servidor',
                    `Respuesta no válida (Status: ${response.status}).\n\nContenido: ${snippet}`
                );
            }

        } catch (error) {
            console.error("Network Error:", error);
            Alert.alert('Conexión Fallida', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>🌱</Text>
                <Text style={styles.title}>AgroApp</Text>
                <Text style={styles.subtitle}>Gestión de Tareas</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número de Celular</Text>
                    <View style={styles.inputContainer}>
                        <Feather name="phone" color="#6b7280" size={20} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 3101234567"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            editable={!loading}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputContainer}>
                        <Feather name="lock" color="#6b7280" size={20} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Tu contraseña"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            editable={!loading}
                        />
                    </View>
                </View>


                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.buttonContent}>
                            <Text style={styles.buttonText}>Ingresar</Text>
                            <Feather name="log-in" color="#fff" size={20} style={{ marginLeft: 10 }} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Si no tienes cuenta, contacta al administrador.</Text>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#16a34a', // green-600
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: '#f9fafb',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    button: {
        backgroundColor: '#16a34a',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
        alignItems: 'center',
    },
    footerText: {
        color: '#9ca3af',
        fontSize: 12,
        textAlign: 'center',
    }
});
