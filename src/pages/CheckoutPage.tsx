import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { CheckoutFormInput, DeliveryMethod, Order } from '../types/store';
import { BRAND_INFO, DELIVERY_METHODS } from '../types/store';
import {
  formatPriceBYN,
  validateCheckoutForm,
  type CheckoutValidationErrors,
} from '../utils/storeLogic';
import type { AppRoute } from '../components/Header';

interface CheckoutPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { cart, cartSummary, user, placeOrder } = useStore();

  const [form, setForm] = useState<CheckoutFormInput>({
    customerName: user?.displayName || '',
    customerPhone: '',
    customerEmail: user?.email || '',
    deliveryAddress: '',
    deliveryMethod: 'europost',
    comment: '',
  });
  const [errors, setErrors] = useState<CheckoutValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (confirmedOrder) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [confirmedOrder]);

  if (confirmedOrder) {
    const deliveryLabel =
      DELIVERY_METHODS.find((m) => m.key === confirmedOrder.deliveryMethod)?.label ||
      confirmedOrder.deliveryMethod;

    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-2xl mx-auto bg-[#111114] border border-zinc-800 p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-[#A3E635] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-wider text-[#A3E635]">
                Заказ принят
              </p>
              <h1 className="font-display text-3xl font-bold text-white uppercase">
                Заказ {confirmedOrder.orderNumber} оформлен
              </h1>
              <p className="text-sm text-zinc-400">
                Администратор получил уведомление. Мы свяжемся с вами в ближайшее время для подтверждения отправки.
              </p>
            </div>
          </div>

          <div className="border-y border-zinc-800/80 py-5 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Получатель</span>
              <span className="text-zinc-100 text-right">{confirmedOrder.customerName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Телефон</span>
              <span className="font-mono text-zinc-100 text-right">{confirmedOrder.customerPhone}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Доставка</span>
              <span className="text-zinc-100 text-right">{deliveryLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Адрес / отделение</span>
              <span className="text-zinc-100 text-right">{confirmedOrder.deliveryAddress}</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-zinc-800/60 font-semibold">
              <span className="text-white">Сумма заказа</span>
              <span className="font-mono tabular-nums text-[#A3E635]">
                {formatPriceBYN(confirmedOrder.totalAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-zinc-400">
            <p>
              По вопросам срочной отправки или замеров пишите напрямую:{' '}
              <a
                href={BRAND_INFO.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A3E635] underline"
              >
                {BRAND_INFO.supportHandle}
              </a>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate({ page: 'catalog' })}
              className="px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-bold hover:bg-lime-300 transition-colors cursor-pointer"
            >
              Продолжить покупки
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              className="px-5 py-3 border border-zinc-700 text-zinc-200 text-sm font-medium hover:border-white hover:text-white transition-colors cursor-pointer"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-3xl text-white uppercase">Нет товаров для оформления</h1>
        <button
          type="button"
          onClick={() => onNavigate({ page: 'catalog' })}
          className="px-6 py-3 bg-[#A3E635] text-[#09090B] text-sm font-bold cursor-pointer"
        >
          Вернуться в каталог
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validateCheckoutForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder(form);
      setConfirmedOrder(order);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Не удалось сохранить заказ. Попробуйте снова или свяжитесь с @NikitaZombie.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <button
        type="button"
        onClick={() => onNavigate({ page: 'cart' })}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Вернуться в корзину</span>
      </button>

      <div className="border-b border-zinc-800/80 pb-5">
        <p className="text-xs text-zinc-500 tracking-[0.08em] uppercase">Доставка по РБ и РФ</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white uppercase mt-1">
          Оформление заказа
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-7 bg-[#111114] border border-zinc-800/80 p-6 sm:p-8 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="checkout-name" className="block text-xs font-medium text-zinc-300">
                Имя и фамилия *
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="Иван Петров"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
              {errors.customerName && (
                <p className="text-xs text-red-400" role="alert">
                  {errors.customerName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-phone" className="block text-xs font-medium text-zinc-300">
                Телефон *
              </label>
              <input
                id="checkout-phone"
                type="tel"
                required
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="+375 29 123-45-67"
                className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
              />
              {errors.customerPhone && (
                <p className="text-xs text-red-400" role="alert">
                  {errors.customerPhone}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="checkout-email" className="block text-xs font-medium text-zinc-300">
              Email *
            </label>
            <input
              id="checkout-email"
              type="email"
              required
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
            {errors.customerEmail && (
              <p className="text-xs text-red-400" role="alert">
                {errors.customerEmail}
              </p>
            )}
          </div>

          {/* Delivery Method Radio Options */}
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-medium text-zinc-300">Способ доставки *</legend>
            <div className="grid grid-cols-1 gap-2.5">
              {DELIVERY_METHODS.map((method) => {
                const selected = form.deliveryMethod === method.key;
                return (
                  <label
                    key={method.key}
                    className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-colors ${
                      selected
                        ? 'border-[#A3E635] bg-[#161912]'
                        : 'border-zinc-800 bg-[#09090B] hover:border-zinc-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={method.key}
                      checked={selected}
                      onChange={() =>
                        setForm({ ...form, deliveryMethod: method.key as DeliveryMethod })
                      }
                      className="mt-1 accent-[#A3E635]"
                    />
                    <div>
                      <span className="block text-sm font-medium text-white">{method.label}</span>
                      <span className="block text-xs text-zinc-400 mt-0.5">{method.note}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="checkout-address" className="block text-xs font-medium text-zinc-300">
              Адрес доставки или номер отделения *
            </label>
            <input
              id="checkout-address"
              type="text"
              required
              value={form.deliveryAddress}
              onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="г. Минск, отделение Европочты №14 / г. Москва, ПВЗ СДЭК..."
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
            {errors.deliveryAddress && (
              <p className="text-xs text-red-400" role="alert">
                {errors.deliveryAddress}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="checkout-comment" className="block text-xs font-medium text-zinc-300">
              Комментарий к заказу (Telegram для быстрой связи, пожелания)
            </label>
            <textarea
              id="checkout-comment"
              rows={3}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="@username в Telegram или удобное время звонка"
              className="w-full px-3.5 py-2.5 bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#A3E635]"
            />
            {errors.comment && (
              <p className="text-xs text-red-400" role="alert">
                {errors.comment}
              </p>
            )}
          </div>

          {submitError && (
            <div className="p-3.5 bg-red-950/50 border border-red-800 text-xs text-red-200" role="alert">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-[#A3E635] text-[#09090B] text-sm font-bold uppercase tracking-wider hover:bg-lime-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Сохраняем заказ...' : 'Подтвердить заказ'}
          </button>
        </form>

        {/* Order Summary */}
        <aside className="lg:col-span-5 bg-[#111114] border border-zinc-800/80 p-6 sm:p-7 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold text-white uppercase">Состав заказа</h2>
          <ul className="divide-y divide-zinc-800/70">
            {cart.map((item) => (
              <li
                key={`${item.productId}-${item.size}`}
                className="py-3.5 flex items-start justify-between gap-4 text-sm"
              >
                <div className="space-y-0.5">
                  <p className="text-zinc-100 font-medium">{item.title}</p>
                  <p className="text-xs font-mono text-zinc-500">
                    Размер {item.size} × {item.quantity}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-zinc-200 shrink-0">
                  {formatPriceBYN(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t border-zinc-800 flex items-baseline justify-between">
            <span className="text-sm text-zinc-400">Итого к оплате</span>
            <span className="font-mono tabular-nums text-xl font-bold text-[#A3E635]">
              {formatPriceBYN(cartSummary.totalAmount)}
            </span>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            Онлайн-оплата на сайте не требуется. После оформления заказа менеджер свяжется с вами для подтверждения наличия и отправки трек-номера.
          </p>
        </aside>
      </div>
    </div>
  );
};
