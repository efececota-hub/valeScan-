'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Usamos una referencia para evitar subscripciones duplicadas por re-renders rápidos
  const lastQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const currentQueryKey = JSON.stringify((query as any)._query || query);
    if (lastQueryRef.current === currentQueryKey) return;
    lastQueryRef.current = currentQueryKey;

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
      },
      (serverError) => {
        console.error("Firestore useCollection Error:", serverError);
        const permissionError = new FirestorePermissionError({
          path: (query as any)._query?.path?.relativeName || 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => {
      lastQueryRef.current = null;
      unsubscribe();
    };
  }, [query]);

  return { data, loading, error };
}
