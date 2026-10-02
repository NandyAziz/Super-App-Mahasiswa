"use client";

import { Modal } from "@/components/ui/Modal";
import { ProjectForm } from "./ProjectForm";

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal pengajuan proyek IT (bottom-sheet) yang membungkus `ProjectForm` agar
 * form yang sama dipakai dari halaman `/projects`.
 */
export function ProjectFormModal({ open, onClose }: ProjectFormModalProps) {
  return (
    <Modal open={open} title="Post Proyek Baru" onClose={onClose}>
      <ProjectForm onSuccess={onClose} />
    </Modal>
  );
}
