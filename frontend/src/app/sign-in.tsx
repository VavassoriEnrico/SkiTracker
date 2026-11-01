import { useContext } from 'react';
import AuthScreen from '../screens/AuthScreen';
import { SessionErrorContext } from '../lib/sessionError';

export default function SignIn() {
  return <AuthScreen sessionError={useContext(SessionErrorContext)} />;
}
