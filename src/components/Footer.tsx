import Link from "next/link";
import { Mail, MessageCircle, Globe } from "lucide-react";

const columns = [
  {
    title: "Продукт",
    links: [
      { label: "Как это работает", href: "/#how-it-works" },
      { label: "Тарифы", href: "/#pricing" },
      { label: "Совместимость", href: "/#compatibility" },
      { label: "Скачать мод", href: "/#download" },
    ],
  },
  {
    title: "Поддержка",
    links: [
      { label: "Часто задаваемые вопросы", href: "/faq" },
      { label: "Руководство по установке", href: "/guide" },
      { label: "Обратная связь", href: "/feedback" },
    ],
  },
  {
    title: "Правовая информация",
    links: [
      { label: "Политика конфиденциальности", href: "/privacy" },
      { label: "Условия использования", href: "/terms" },
      { label: "Лицензионное соглашение", href: "/license" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-background-secondary border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contacts column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Контакты</h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:support@nvltranslate.com"
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors duration-200"
                >
                  <Mail className="w-4 h-4" />
                  support@nvltranslate.com
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/nvltranslate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors duration-200"
                >
                  <MessageCircle className="w-4 h-4" />
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nvltranslate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors duration-200"
                >
                  <Globe className="w-4 h-4" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-foreground-muted text-center">
            &copy; {new Date().getFullYear()} NVL Translate. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
