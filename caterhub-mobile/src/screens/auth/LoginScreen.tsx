import { isWeb } from '../../utils/platform';
import LoginScreenWeb from './LoginScreen.web';
import LoginScreenMobile from './LoginScreen.mobile';

// Platform-specific login screen
// Exports the appropriate component based on the platform
const LoginScreen = isWeb ? LoginScreenWeb : LoginScreenMobile;

export default LoginScreen;

