import { useAnalytics } from 'reactfire';
import { logEvent } from 'firebase/analytics';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function MyPageViewLogger({ location }) {
    const analytics = useAnalytics();
    const router = useRouter();

    // By passing `location.pathname` to the second argument of `useEffect`,
    // we only log on first render and when the `pathname` changes
    useEffect(() => {
        if (router.isReady) {
            logEvent(analytics, 'page_view', { page_location: router.asPath });
        }
    }, [router.asPath]);

    return null;
}
