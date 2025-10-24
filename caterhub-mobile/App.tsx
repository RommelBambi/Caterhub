import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/store/auth';
import RootNav from './src/navigation/RootNav';

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNav/>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}
