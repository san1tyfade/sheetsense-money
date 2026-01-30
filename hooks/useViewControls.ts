
import { useState, useMemo } from 'react';
import { useSearchProtocol } from './useSearchProtocol';

export function useViewControls<T>(
    initialData: T[],
    sortFns: Record<string, (a: T, b: T) => number>,
    filterFn: (item: T, term: string) => boolean,
    defaultSort: string
) {
    const search = useSearchProtocol();
    const [sortKey, setSortKey] = useState(defaultSort);
    const [isTable, setIsTable] = useState(window.innerWidth > 1024);

    const processed = useMemo(() => {
        let filtered = initialData.filter(i => filterFn(i, search.searchTerm));
        if (sortFns[sortKey]) {
            filtered = [...filtered].sort(sortFns[sortKey]);
        }
        return filtered;
    }, [initialData, search.searchTerm, sortKey, sortFns, filterFn]);

    return {
        data: processed,
        search,
        sort: { key: sortKey, set: setSortKey },
        view: { isTable, toggle: () => setIsTable(!isTable) }
    };
}
