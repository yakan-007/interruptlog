'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">プライバシーポリシー</h1>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        InterruptLog は、記録したデータを端末内に保存します。外部サーバーへの送信や共有は行いません。
      </p>
      <div className="mt-6 space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">収集する情報</h2>
          <p className="mt-2">アプリ内で入力したタスク、イベント履歴、設定情報を端末内に保存します。</p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">第三者提供</h2>
          <p className="mt-2">取得した情報を第三者へ提供することはありません。</p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">分析・クラッシュ収集</h2>
          <p className="mt-2">分析ツールやクラッシュ収集ツールは利用していません。</p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">お問い合わせ</h2>
          <p className="mt-2">ご不明点があれば、アプリ内の設定画面からご連絡ください。</p>
        </section>
      </div>
      <div className="mt-8">
        <Link href="/settings" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
          設定に戻る
        </Link>
      </div>
    </div>
  );
}
