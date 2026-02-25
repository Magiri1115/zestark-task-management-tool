'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkAdminPermission(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.role?.name !== 'admin') {
    throw new Error('管理者権限が必要です');
  }
}

export async function backupDatabase() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }
  await checkAdminPermission(session.user.id);

  // ここにDBバックアップロジックを実装
  // 例: pg_dump コマンドの実行、S3へのアップロードなど
  // 今回はダミーの処理
  console.log('Database backup initiated by admin:', session.user.id);

  // 実際のバックアップ処理は非同期で行われることが多いので、
  // 成功/失敗を返すか、バックアップIDを返すなどする
  return { success: true, message: 'DBバックアップが開始されました。' };
}
