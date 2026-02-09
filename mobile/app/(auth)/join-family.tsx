import { Redirect } from 'expo-router';

// Redirect to create-family which has a join tab
export default function JoinFamily() {
  return <Redirect href="/(auth)/create-family" />;
}
