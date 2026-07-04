import { useAppContext } from '../context/AppContext';

export function useConsent() {
  const { consentGiven, setConsentGiven } = useAppContext();

  const grantConsent = () => setConsentGiven(true);
  const revokeConsent = () => setConsentGiven(false);

  return { consentGiven, grantConsent, revokeConsent };
}
