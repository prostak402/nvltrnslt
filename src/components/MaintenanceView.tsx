import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function MaintenanceView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-warning/30 bg-background-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          РЎР°Р№С‚ РІ СЂРµР¶РёРјРµ РѕР±СЃР»СѓР¶РёРІР°РЅРёСЏ
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground-secondary">
          РЎРµР№С‡Р°СЃ РґРѕСЃС‚СѓРї РѕС‚РєСЂС‹С‚ С‚РѕР»СЊРєРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°Рј. Р•СЃР»Рё
          РІС‹ Р°РґРјРёРЅ, РІРѕР№РґРёС‚Рµ РІ СЃРІРѕР№ Р°РєРєР°СѓРЅС‚, С‡С‚РѕР±С‹ РїСЂРѕРґРѕР»Р¶РёС‚СЊ
          СЂР°Р±РѕС‚Сѓ.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Р’РѕР№С‚Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂСѓ
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-hover hover:text-foreground"
          >
            РќР° РіР»Р°РІРЅСѓСЋ
          </Link>
        </div>
      </div>
    </main>
  );
}
