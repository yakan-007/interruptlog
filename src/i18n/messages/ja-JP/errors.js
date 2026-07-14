const messages = {
errors: {
        checkInput: '入力を確認してください',
        invalidWindow: '終了は開始より後にしてください',
        invalidDate: '日時を確認してください',
        eventNotFound: 'イベントが見つかりませんでした',
        interruptNotActive: '割り込み作業が開始されていません',
        invalidBackup: 'JSONを読み込めませんでした',
        invalidEventWindow: '開始と終了を正しく入力してください',
        pauseActive: '先に現在の割り込みや休憩を処理してください',
        runningOverlap: '現在進行中の時間帯は、いったん停止してから編集してください',
        sameDayRequired: '時間帯を記録し直せるのは同じ日の範囲だけです',
        taskCreateFailed: 'タスクを作成できませんでした',
        taskNameRequired: 'タスク名を入力してください',
        taskNotFound: '選んだタスクが見つかりませんでした',
      },
};

export default messages.errors;
