import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminRole   = await prisma.role.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: "admin" } });
  const editorRole  = await prisma.role.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: "editor" } });
  const viewerRole  = await prisma.role.upsert({ where: { id: 3 }, update: {}, create: { id: 3, name: "viewer" } });

  await prisma.user.upsert({ where: { email: "admin@example.com" }, update: {}, create: {
    email: "admin@example.com", name: "システム管理者",
    password_hash: await bcrypt.hash("admin123", 10), role_id: adminRole.id
  }});
  await prisma.user.upsert({ where: { email: "editor@example.com" }, update: {}, create: {
    email: "editor@example.com", name: "テスト編集者",
    password_hash: await bcrypt.hash("editor123", 10), role_id: editorRole.id
  }});
  await prisma.user.upsert({ where: { email: "viewer@example.com" }, update: {}, create: {
    email: "viewer@example.com", name: "テスト閲覧者",
    password_hash: await bcrypt.hash("viewer123", 10), role_id: viewerRole.id
  }});

  const project = await prisma.project.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" }, update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", name: "デフォルトプロジェクト", description: "初期プロジェクト" }
  });

  const tasks = [
    { id: "00000000-0000-0000-0000-000000000101", task_code: "T1-01", name: "要件定義",    status: "COMPLETED"   as const, phase: "第1段階", effort_hours: 8,  effort_level: "MEDIUM" as const },
    { id: "00000000-0000-0000-0000-000000000102", task_code: "T1-02", name: "DB設計",      status: "IN_PROGRESS" as const, phase: "第1段階", effort_hours: 16, effort_level: "HEAVY"  as const },
    { id: "00000000-0000-0000-0000-000000000103", task_code: "T2-01", name: "UI実装",      status: "NOT_STARTED" as const, phase: "第2段階", effort_hours: 24, effort_level: "HEAVY"  as const },
  ];
  for (const t of tasks) {
    await prisma.task.upsert({ where: { id: t.id }, update: {}, create: { ...t, project_id: project.id } });
  }

  console.log("✅ Seed完了");
  console.log("admin@example.com / admin123");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
