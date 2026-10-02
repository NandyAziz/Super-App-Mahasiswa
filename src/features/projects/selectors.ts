import type {
  CodingProject,
  ProjectProgressStatus,
} from "./types";

/** Proyek open milik mahasiswa lain (tersedia untuk freelancer). */
export function selectMarketplaceProjects(
  projects: CodingProject[],
  userId: string,
): CodingProject[] {
  return projects.filter(
    (project) => project.status === "pending" && project.client_id !== userId,
  );
}

/** Proyek yang saya posting (client) maupun yang saya kerjakan (freelancer). */
export function selectMyProjects(
  projects: CodingProject[],
  userId: string,
): CodingProject[] {
  return projects.filter(
    (project) =>
      project.client_id === userId || project.freelancer_id === userId,
  );
}

export interface ProjectCardAction {
  kind: "take" | "status";
  label: string;
  nextStatus?: ProjectProgressStatus;
}

/** Menentukan tombol aksi kontekstual berdasarkan status & peran user. */
export function resolveProjectCardAction(
  project: CodingProject,
  userId: string,
): ProjectCardAction | null {
  const isFreelancer = project.freelancer_id === userId;

  if (project.status === "pending" && project.client_id !== userId) {
    return { kind: "take", label: "Ambil Proyek" };
  }
  if (project.status === "accepted" && isFreelancer) {
    return { kind: "status", label: "Mulai Kerjakan", nextStatus: "in_progress" };
  }
  if (project.status === "in_progress" && isFreelancer) {
    return { kind: "status", label: "Selesaikan", nextStatus: "completed" };
  }

  return null;
}

/** Pemilik (client) boleh membatalkan proyek selama belum diambil freelancer. */
export function canCancelProject(
  project: CodingProject,
  userId: string,
): boolean {
  return project.client_id === userId && project.status === "pending";
}
