import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface LinkedAccount {
  provider: string;
  providerAccountId: string;
  createdAt: string;
}

interface EmailPreferences {
  marketing?: boolean;
  product?: boolean;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  hasPassword: boolean;
  timezone: string | null;
  phone: string | null;
  company: string | null;
  emailVerifiedAt: string | null;
  emailPreferences: EmailPreferences | null;
  accounts: LinkedAccount[];
}

export function useProfile() {
  const qc = useQueryClient();

  const { data: profile, isLoading: loading } = useQuery<Profile>({
    queryKey: queryKeys.profile.all,
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Name updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changePassword = useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword?: string;
      newPassword: string;
    }) => {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Password updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTimezone = useMutation({
    mutationFn: async (timezone: string | null) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Timezone updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateProfile = useMutation({
    mutationFn: async (
      fields: Partial<
        Pick<Profile, "name" | "timezone" | "phone" | "company"> & {
          emailPreferences: EmailPreferences;
        }
      >
    ) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Profile updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unlinkAccount = useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch("/api/user/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to unlink");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success("Account unlinked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    profile: profile ?? null,
    loading,
    updateName: updateName.mutateAsync,
    updatingName: updateName.isPending,
    changePassword: changePassword.mutateAsync,
    changingPassword: changePassword.isPending,
    updateTimezone: updateTimezone.mutateAsync,
    updatingTimezone: updateTimezone.isPending,
    updateProfile: updateProfile.mutateAsync,
    updatingProfile: updateProfile.isPending,
    unlinkAccount: unlinkAccount.mutateAsync,
    unlinkingAccount: unlinkAccount.isPending,
  };
}
