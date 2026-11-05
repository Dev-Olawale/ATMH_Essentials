"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { changeAdminRole, inviteAdmin, removeAdmin, type TeamState } from "@/app/admin/actions/team";
import { Badge, Field, inputClass, SubmitButton, useFormAction } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export type TeamMember = { id: string; email: string; role: "OWNER" | "STAFF"; isYou: boolean; protectedOwner: boolean };

export function TeamManager({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const { state: inviteState, pending: inviting, onSubmit: invite } = useFormAction<TeamState>(
    async (previous, formData) => {
      const result = await inviteAdmin(previous, formData);
      if (result.status === "done") router.refresh();
      return result;
    },
    { status: "idle" },
  );
  const [message, setMessage] = useState<TeamState>({ status: "idle" });
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (task: () => Promise<TeamState>) =>
    startTransition(async () => {
      setMessage(await task());
      setConfirmRemove(null);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={invite} className="flex flex-col gap-3 rounded-xl bg-white p-4">
        <h2 className="font-sans text-sm font-medium tracking-widest uppercase">Add someone</h2>
        <Field label="Their email" htmlFor="invite-email">
          <input id="invite-email" name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Role" htmlFor="invite-role" hint="Staff: products, categories and orders. Owner: everything, including team and settings.">
          <select id="invite-role" name="role" defaultValue="STAFF" className={inputClass}>
            <option value="STAFF">Staff</option>
            <option value="OWNER">Owner</option>
          </select>
        </Field>
        {inviteState.status !== "idle" && (
          <p role={inviteState.status === "error" ? "alert" : "status"} className={`text-sm ${inviteState.status === "error" ? "border-l-2 border-rose-dark pl-2 text-ink" : "text-ink"}`}>
            {inviteState.message}
          </p>
        )}
        <SubmitButton pending={inviting} pendingLabel="Adding…">Give access</SubmitButton>
      </form>

      {message.status !== "idle" && (
        <p role={message.status === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${message.status === "error" ? "border border-rose-dark bg-blush" : "bg-blush-deep"}`}>
          {message.message}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{member.email}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={member.role === "OWNER" ? "rose" : "muted"}>{member.role === "OWNER" ? "Owner" : "Staff"}</Badge>
                {member.isYou && <Badge>You</Badge>}
                {member.protectedOwner && <Badge tone="gold">Safety owner</Badge>}
              </div>
            </div>
            {!member.isYou && !member.protectedOwner && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => changeAdminRole(member.id, member.role === "OWNER" ? "STAFF" : "OWNER"))}
                >
                  Make {member.role === "OWNER" ? "staff" : "owner"}
                </Button>
                {confirmRemove === member.id ? (
                  <Button type="button" size="sm" disabled={pending} onClick={() => run(() => removeAdmin(member.id))}>
                    Yes, remove
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(member.id)}>
                    Remove access
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
