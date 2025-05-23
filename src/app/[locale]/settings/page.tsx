import SettingsPage from '../../settings/page';
import { useParams } from 'next/navigation';

export default function LocaleSettingsPage() {
  // localeパラメータ取得（将来のi18n拡張用）
  // const params = useParams();
  // const locale = params?.locale || 'ja';
  return <SettingsPage />;
} 