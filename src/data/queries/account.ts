import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';

/** The signed-in owner, null when signed out, undefined while the stored session loads. */
export function useSession() {
  const source = useDataSource();
  const query = useQuery({ queryKey: keys.session, queryFn: () => source.auth.getSession(), staleTime: Infinity });
  return { session: query.data, isLoading: query.isPending };
}

export function useSignIn() {
  const source = useDataSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => source.auth.signIn(email, password),
    onSuccess: (session) => qc.setQueryData(keys.session, session),
  });
}

export function useSignOut() {
  const source = useDataSource();
  const qc = useQueryClient();
  return useMutation({
    // Signing out of this device only clears the local session, so it must not wait for the network.
    networkMode: 'always',
    mutationFn: () => source.auth.signOut(),
    onSuccess: () => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
      qc.setQueryData(keys.session, null);
    },
  });
}

export function useUpdateName() {
  const source = useDataSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => source.auth.updateName(name),
    onSuccess: (session) => qc.setQueryData(keys.session, session),
  });
}

export function useChangePassword() {
  const source = useDataSource();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      source.auth.changePassword(currentPassword, newPassword),
  });
}
