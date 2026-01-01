import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import ExecutionFormScreen from './src/screens/ExecutionFormScreen';
import { TrackingProvider } from './src/context/TrackingContext';

type Screen = 'LOGIN' | 'HOME' | 'DETAIL' | 'EXECUTION';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setCurrentScreen('HOME');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('LOGIN');
    setSelectedTask(null);
  };

  const handleTaskSelect = (task: any) => {
    setSelectedTask(task);
    setCurrentScreen('DETAIL');
  };

  const handleBackToHome = () => {
    setSelectedTask(null);
    setCurrentScreen('HOME');
  };

  const handleOpenExecution = () => {
    setCurrentScreen('EXECUTION');
  };

  const handleFinishExecution = () => {
    setSelectedTask(null);
    setCurrentScreen('HOME');
  };

  return (
    <TrackingProvider>
      <View style={styles.container}>
        {!user || currentScreen === 'LOGIN' ? (
          <>
            <LoginScreen onLogin={handleLogin} />
            <StatusBar style="auto" />
          </>
        ) : (
          <>
            {currentScreen === 'EXECUTION' && selectedTask && (
              <ExecutionFormScreen
                task={selectedTask}
                onBack={() => setCurrentScreen('DETAIL')}
                onFinish={handleFinishExecution}
              />
            )}

            {currentScreen === 'DETAIL' && selectedTask && (
              <TaskDetailScreen
                task={selectedTask}
                onBack={handleBackToHome}
                onUpdate={handleBackToHome}
                onStartExecution={handleOpenExecution}
                onTaskUpdate={(updated) => setSelectedTask(updated)}
              />
            )}

            {currentScreen === 'HOME' && (
              <HomeScreen
                user={user}
                onLogout={handleLogout}
                onSelectTask={handleTaskSelect}
              />
            )}
            <StatusBar style="light" />
          </>
        )}
      </View>
    </TrackingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
