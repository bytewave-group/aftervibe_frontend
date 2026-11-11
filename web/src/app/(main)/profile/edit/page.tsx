import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditProfileBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadProfileForEdit } from "@/lib/api/profile-edit";
import { Suspense } from "react";

async function EditContent() {
  const profile = await loadProfileForEdit();
  return (
    <div className="anim-content-fade">
      <EditProfileForm initial={profile} />
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <>
      <PageHeader titleKey="profileEdit.title" backHref="/?tab=me" />
      <PageMain>
        <Suspense fallback={<EditProfileBodySkeleton />}>
          <EditContent />
        </Suspense>
      </PageMain>
    </>
  );
}
