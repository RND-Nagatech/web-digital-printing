import { useEffect, useRef } from 'react';

type AutoRefreshOptions = {
    enabled?: boolean;
    intervalMs?: number;
    runWhenHidden?: boolean;
};

export const useAutoRefresh = (
    refresh: () => void | Promise<void>,
    options: AutoRefreshOptions = {},
) => {
    const { enabled = true, intervalMs = 10_000, runWhenHidden = false } = options;
    const refreshRef = useRef(refresh);
    const runningRef = useRef(false);

    useEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        if (!enabled) return;

        const tick = async () => {
            if (!runWhenHidden && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                return;
            }
            if (runningRef.current) return;

            runningRef.current = true;
            try {
                await refreshRef.current();
            } finally {
                runningRef.current = false;
            }
        };

        const id = window.setInterval(() => {
            void tick();
        }, intervalMs);

        return () => {
            window.clearInterval(id);
        };
    }, [enabled, intervalMs, runWhenHidden]);
};
