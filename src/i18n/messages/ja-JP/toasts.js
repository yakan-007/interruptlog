const messages = {
toasts: {
        eventAdded: '記録を追加しました',
        eventSaved: '記録を保存しました',
        eventDeleted: '記録を削除しました',
        interruptSaved: '割り込みを記録しました',
        breakSaved: '休憩を記録しました',
        duePushed: (count) => `${count}件の期限を組み直しました`,
        sortDueOff: '並べ替えたので、期限順を解除しました',
        repaired: '重なった記録を整理しました',
        jsonExported: 'JSONを書き出しました',
        exportCanceled: '書き出しをキャンセルしました',
        jsonImported: 'JSONを読み込みました',
        csvExported: 'CSVを書き出しました',
        dailyReportCopied: '日報をコピーしました',
        workTableCopied: (count) => `表をコピーしました（${count}行）`,
        copyFailed: 'コピーできませんでした',
        storageSaveFailed: 'このブラウザに保存できません。容量やプライベートモードを確認してください',
      },
};

export default messages.toasts;
