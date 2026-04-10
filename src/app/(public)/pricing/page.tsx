import {
  Check,
  X,
  Zap,
  Crown,
  Star,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
} from "lucide-react";

export const metadata = {
  title: "Тарифы — NVL Translate",
};

const plans = [
  {
    name: "Бесплатно",
    price: "0",
    currency: "",
    period: "",
    icon: Zap,
    description: "Для знакомства с платформой",
    highlighted: false,
    features: [
      { text: "30–50 переводов в день", included: true },
      { text: "Ограниченный словарь", included: true },
      { text: "Перевод слова", included: true },
      { text: "Перевод фразы", included: true },
      { text: "Синхронизация с сайтом", included: true },
      { text: "Базовая история", included: true },
      { text: "Базовые карточки", included: true },
      { text: "Поиск и фильтры", included: false },
      { text: "Упражнения", included: false },
      { text: "Расширенная статистика", included: false },
    ],
  },
  {
    name: "Базовый",
    price: "$4.99",
    currency: "",
    period: "/мес",
    icon: Star,
    description: "Для активного изучения",
    highlighted: true,
    features: [
      { text: "200 переводов в день", included: true },
      { text: "Полный словарь", included: true },
      { text: "Перевод слова", included: true },
      { text: "Перевод фразы", included: true },
      { text: "Синхронизация с сайтом", included: true },
      { text: "Полная история переводов", included: true },
      { text: "Расширенные карточки", included: true },
      { text: "Поиск и фильтры", included: true },
      { text: "Карточки и подбор пар", included: true },
      { text: "Ежедневный прогресс", included: true },
    ],
  },
  {
    name: "Расширенный",
    price: "$9.99",
    currency: "",
    period: "/мес",
    icon: Crown,
    description: "Максимум возможностей",
    highlighted: false,
    features: [
      { text: "Безлимит переводов", included: true },
      { text: "Полный словарь", included: true },
      { text: "Перевод слова", included: true },
      { text: "Перевод фразы", included: true },
      { text: "Синхронизация с сайтом", included: true },
      { text: "Полная история переводов", included: true },
      { text: "Все виды карточек", included: true },
      { text: "Поиск и фильтры", included: true },
      { text: "Все упражнения", included: true },
      { text: "Расширенная статистика", included: true },
      { text: "Авто-перевод предложений", included: true },
      { text: "Приоритетная обработка", included: true },
    ],
  },
];

const comparisonFeatures = [
  { name: "Переводов в день", free: "30–50", basic: "200", extended: "Безлимит" },
  { name: "Словарь", free: "Ограниченный", basic: "Полный", extended: "Полный" },
  { name: "Перевод слов", free: true, basic: true, extended: true },
  { name: "Перевод фраз", free: true, basic: true, extended: true },
  { name: "Синхронизация", free: true, basic: true, extended: true },
  { name: "История переводов", free: "Базовая", basic: "Полная", extended: "Полная" },
  { name: "Карточки", free: "Базовые", basic: "Расширенные", extended: "Все виды" },
  { name: "Поиск и фильтры", free: false, basic: true, extended: true },
  { name: "Упражнения (подбор пар и др.)", free: false, basic: true, extended: true },
  { name: "Ежедневный прогресс", free: false, basic: true, extended: true },
  { name: "Расширенная статистика", free: false, basic: false, extended: true },
  { name: "Авто-перевод предложений", free: false, basic: false, extended: true },
  { name: "Приоритетная обработка", free: false, basic: false, extended: true },
];

const faqs = [
  {
    question: "Какие способы оплаты поддерживаются?",
    answer:
      "Мы принимаем банковские карты (Visa, Mastercard), а также оплату через PayPal. Все платежи обрабатываются через безопасный платёжный шлюз.",
  },
  {
    question: "Можно ли отменить подписку?",
    answer:
      "Да, подписку можно отменить в любой момент в личном кабинете. Доступ к платным функциям сохранится до конца оплаченного периода.",
  },
  {
    question: "Есть ли пробный период?",
    answer:
      "Бесплатный тариф доступен без ограничений по времени. Вы можете пользоваться базовыми функциями столько, сколько захотите, и перейти на платный тариф, когда будете готовы.",
  },
  {
    question: "Что произойдёт с моими данными при смене тарифа?",
    answer:
      "Все ваши сохранённые слова, фразы и прогресс обучения сохранятся при любой смене тарифа. При понижении тарифа некоторые функции станут недоступны, но данные не удаляются.",
  },
  {
    question: "Можно ли оплатить на год вперёд?",
    answer:
      "Да, годовая подписка доступна со скидкой 20%. Выберите годовой план при оформлении подписки в личном кабинете.",
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-success mx-auto" />;
  if (value === false) return <X className="w-5 h-5 text-foreground-muted mx-auto" />;
  return <span className="text-foreground text-sm">{value}</span>;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <CreditCard className="w-4 h-4" />
            Тарифы
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Выберите подходящий тариф
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            Начните бесплатно и переходите на расширенный план по мере необходимости.
            Все тарифы включают синхронизацию между игрой и сайтом.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-background-card border rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? "border-accent shadow-[0_0_30px_rgba(108,92,231,0.15)]"
                  : "border-border"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Популярный
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlighted
                      ? "bg-accent-light"
                      : "bg-background-hover"
                  }`}
                >
                  <plan.icon
                    className={`w-5 h-5 ${
                      plan.highlighted ? "text-accent" : "text-foreground-secondary"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-foreground-muted text-sm">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-foreground-secondary">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-foreground-secondary text-sm"
                          : "text-foreground-muted text-sm"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "bg-background-hover text-foreground border border-border hover:border-border-hover"
                }`}
              >
                Подключить
              </button>
            </div>
          ))}
        </section>

        {/* Comparison Table */}
        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Сравнение тарифов
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">
                    Функция
                  </th>
                  <th className="text-center text-foreground text-sm font-medium p-4 border-b border-border">
                    Бесплатно
                  </th>
                  <th className="text-center text-accent text-sm font-medium p-4 border-b border-border">
                    Базовый
                  </th>
                  <th className="text-center text-foreground text-sm font-medium p-4 border-b border-border">
                    Расширенный
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="hover:bg-background-hover transition-colors">
                    <td className="text-foreground-secondary text-sm p-4 border-b border-border">
                      {row.name}
                    </td>
                    <td className="text-center p-4 border-b border-border">
                      <CellValue value={row.free} />
                    </td>
                    <td className="text-center p-4 border-b border-border">
                      <CellValue value={row.basic} />
                    </td>
                    <td className="text-center p-4 border-b border-border">
                      <CellValue value={row.extended} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle className="w-6 h-6 text-accent" />
            <h2 className="text-3xl font-bold text-foreground">Вопросы об оплате</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-background-card border border-border rounded-xl p-6"
              >
                <h3 className="text-foreground font-medium flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  {faq.question}
                </h3>
                <p className="text-foreground-secondary text-sm mt-3 ml-8">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
