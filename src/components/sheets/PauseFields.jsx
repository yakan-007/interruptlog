import { t } from '../../i18n';
import { ChipRow, MemoField, SenderField } from './RecordFields';

export function InterruptFields({
  state,
  locale,
  who,
  setWho,
  saveWhoChip,
  setSaveWhoChip,
  label,
  setLabel,
  memo,
  setMemo,
}) {
  return (
    <>
      <SenderField
        whoChips={state.whoChips}
        who={who}
        onChange={setWho}
        saveWhoChip={saveWhoChip}
        onSaveWhoChipChange={setSaveWhoChip}
        locale={locale}
      />

      <div className="il-field">
        <label>{t(locale, 'sheets.subject')}</label>
        <ChipRow>
          {state.subjectChips.map((item) => (
            <button key={item} type="button" className={'c' + (label === item ? ' sel' : '')} onClick={() => setLabel(item)}>{item}</button>
          ))}
        </ChipRow>
        <input
          className="il-input"
          placeholder={t(locale, 'sheets.subjectFree')}
          value={label && !state.subjectChips.includes(label) ? label : ''}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <MemoField type="interrupt" memo={memo} onChange={setMemo} locale={locale} />
    </>
  );
}
