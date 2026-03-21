"use client";

import { useMeetings } from "@/hooks/use-meetings";
import { MeetingList } from "@/components/meeting-list";
import { CreateMeetingDialog } from "@/components/create-meeting-dialog";

export default function DashboardPage() {
  const {
    meetings,
    loading,
    createMeeting,
    joinAgent,
    stopAgent,
    deleteMeeting,
  } = useMeetings();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KiviKova</h1>
          <p className="text-muted-foreground">AI Video Call Agent</p>
        </div>
        <CreateMeetingDialog
          onCreate={async (title, joinLink) => {
            await createMeeting(title, joinLink);
          }}
        />
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading meetings...
        </div>
      ) : (
        <MeetingList
          meetings={meetings}
          onJoin={joinAgent}
          onStop={stopAgent}
          onDelete={deleteMeeting}
        />
      )}
    </div>
  );
}
