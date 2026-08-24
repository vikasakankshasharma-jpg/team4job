# State Management Architecture Rules

To prevent chaos and maintain a predictable, scalable codebase, TEAM4JOB strictly adheres to the following data ownership rules.

## 1. Server State: React Query (`@tanstack/react-query`)
**Rule:** All data originating from Firestore or external APIs MUST be managed by React Query.
**Do NOT:** Use `useState` or `useEffect` to fetch and store server data. Do NOT store server data in Zustand.

### 1.1 One-time Fetches
Use `useQuery` or `useSuspenseQuery` for standard fetching.
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['jobs', jobId],
  queryFn: () => fetchJob(jobId)
});
```

### 1.2 Real-time Subscriptions (Firestore `onSnapshot`)
For real-time data, wrap `onSnapshot` within a custom hook that uses `queryClient.setQueryData` to push updates into the React Query cache:
```tsx
export function useRealtimeMessages(jobId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['communications', jobId];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, `jobs/${jobId}/communications`), (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      queryClient.setQueryData(queryKey, msgs);
    });
    return () => unsubscribe();
  }, [jobId, queryClient]);

  // Read from cache
  return useQuery({
    queryKey,
    queryFn: () => fetchInitialMessages(jobId), // Optional fallback
    staleTime: Infinity, // Let onSnapshot handle invalidation
  });
}
```

## 2. Global UI State: Zustand (`zustand`)
**Rule:** Use Zustand exclusively for global UI state (e.g., active modals, sidebar toggles, theme preferences).
**Do NOT:** Store Domain/Server Models (like `Job` or `User`) in Zustand.

```tsx
interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}
const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
}));
```

## 3. Form State: React Hook Form (`react-hook-form`)
**Rule:** All complex forms must be managed using `react-hook-form`, preferably with `zod` for validation.
**Do NOT:** Use raw controlled inputs (`useState`) for anything more complex than a single search bar.

## 4. Authentication State: Dedicated Auth Hook
**Rule:** Use a centralized Auth provider/hook (`useAuth` / `AuthProvider`) for user identity.
**Do NOT:** Query the `users` collection manually to determine "who am I" in random components.
