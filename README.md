# 🧟 Лавка Зомби — Селективный магазин винтажной одежды

Веб-приложение интернет-магазина **«Лавка Зомби»** — селективного магазина винтажной и архивной одежды в Минске. Каталог, корзина, оформление заказов, админ-панель и автоматическая синхронизация товаров из VK-альбомов.

> **Шоурум:** г. Минск, ул. Веры Хоружей 3, офис 308
> Пн–Пт 11:00–20:00 · Сб–Вс 11:00–19:00

---

## Скриншот стека

| Слой | Технологии |
|------|-----------|
| **Фронтенд** | React 19, TypeScript 7, Tailwind CSS 4, Motion (Framer Motion), Lucide Icons |
| **Сборка** | Vite 8, Bun |
| **Бэкенд** | Express 4 (TypeScript), TSX |
| **База данных** | Firebase Firestore |
| **Аутентификация** | Firebase Auth (Google OAuth) |
| **Платформа** | Google AI Studio Applet (Firebase) |
| **AI** | Gemini API (`@google/genai`) |

---

## Функциональность

### 🛍️ Покупателям
- **Каталог** с фильтрацией по категориям: куртки, футболки, джинсы, худи, аксессуары
- **Карточка товара** с галереей фото, замерами, описанием эпохи и состояния
- **Корзина** с выбором размера и количества
- **Оформление заказа** с выбором способа доставки (Европочта, Белпочта, СДЭК в РФ)
- **Список «Хочу померить»** (Фиттинги) — сохранение вещей для визита в шоурум
- **Избранное** — личный список понравившихся товаров
- Валюта — белорусский рубль (BYN)

### 🔐 Администратору
- **Админ-панель** с управлением каталогом (CRUD товаров, статусы draft/published)
- **Импорт фотографий из VK** — автоматический парсинг публичных альбомов VK-сообщества
- **Управление заказами** — просмотр, смена статуса (новый → подтверждён → отправлен → завершён)
- **Firebase Auth** — доступ только для верифицированного email администратора

### 🛡️ Безопасность
- Строгие Firestore Security Rules с default-deny
- Валидация всех полей (ограничения по длине, формату, допустимым значениям)
- Защита от SSRF при проксировании изображений (блокировка приватных сетей)
- Иммутабельность `createdAt`, `userId`, `orderNumber` после создания
- Запрет самоназначения ролей (нет эскалации привилегий)
- Изоляция PII заказов (только владелец или админ)

---

## Структура проекта

```
zombie/
├── server.ts                  # Express-сервер (dev + prod)
├── index.html                 # Точка входа SPA
├── vite.config.ts             # Конфигурация Vite
├── package.json               # Зависимости и скрипты
├── firebase-applet-config.json # Конфиг Firebase
├── firestore.rules            # Firestore Security Rules
├── security_spec.md           # Спецификация безопасности
├── public/                    # Статические файлы
└── src/
    ├── main.tsx               # Точка входа React
    ├── App.tsx                # Роутинг (hash-based SPA)
    ├── index.css              # Глобальные стили
    ├── assets/images/         # Изображения товаров и баннеров
    ├── components/
    │   ├── Header.tsx         # Навигация
    │   ├── Footer.tsx         # Подвал
    │   ├── ProductCard.tsx    # Карточка товара
    │   ├── SafeImage.tsx      # Безопасная загрузка изображений
    │   ├── ScrollReveal.tsx   # Анимации при скролле
    │   ├── ErrorBoundary.tsx  # Обработка ошибок
    │   └── admin/             # Компоненты админ-панели
    │       ├── AdminProductFormModal.tsx
    │       └── AdminVkSyncTab.tsx
    ├── context/
    │   └── StoreContext.tsx   # Глобальный стейт (React Context)
    ├── data/
    │   └── seedProducts.ts   # Начальные данные каталога
    ├── lib/
    │   └── firebase.ts       # Инициализация Firebase
    ├── pages/
    │   ├── HomePage.tsx       # Главная (герой-баннер, новинки, категории)
    │   ├── CatalogPage.tsx    # Каталог с фильтрами
    │   ├── ProductDetailPage.tsx  # Детальная карточка
    │   ├── CartPage.tsx       # Корзина
    │   ├── CheckoutPage.tsx   # Оформление заказа
    │   ├── FittingsPage.tsx   # Примерки и избранное
    │   ├── AboutPage.tsx      # О магазине
    │   └── AdminPage.tsx      # Админ-панель
    ├── types/
    │   └── store.ts           # TypeScript-типы и константы
    └── utils/
        ├── storeLogic.ts      # Бизнес-логика магазина
        ├── storeLogic.test.ts # Тесты
        ├── vkAlbumParser.ts   # Парсер VK-альбомов
        └── downloadImage.ts   # Скачивание изображений
```

---

## Быстрый старт

### Требования

- [Bun](https://bun.sh/) ≥ 1.0 (или Node.js ≥ 20)
- Аккаунт Firebase (конфиг уже настроен в `firebase-applet-config.json`)

### Установка

```bash
# Клонировать репозиторий
git clone <url> && cd zombie

# Установить зависимости
bun install

# Скопировать переменные окружения
cp .env.example .env
```

### Настройка `.env`

```env
GEMINI_API_KEY="ваш_ключ_gemini_api"
APP_URL="http://localhost:3000"
VK_OWNER_ID="-139575762"
```

### Запуск

```bash
# Режим разработки (Vite HMR + Express)
bun run dev

# Сборка для продакшена
bun run build

# Запуск продакшен-сервера
bun run start
```

Приложение будет доступно по адресу **http://localhost:3000**.

---

## Скрипты

| Команда | Описание |
|---------|----------|
| `bun run dev` | Запуск dev-сервера (TSX + Vite middleware) |
| `bun run build` | Сборка фронтенда через Vite |
| `bun run start` | Запуск продакшен-сервера |
| `bun run preview` | Превью сборки через Vite |
| `bun run lint` | Проверка типов TypeScript |
| `bun run clean` | Очистка `dist/` и `server.js` |

---

## API-эндпоинты

| Метод | Путь | Описание | Доступ |
|-------|------|----------|--------|
| `GET` | `/api/health` | Health check | Публичный |
| `POST` | `/api/vk/import` | Импорт фото из VK-альбома | Только админ (Bearer token) |
| `GET` | `/api/download-image` | Прокси-скачивание изображения | Публичный |

---

## Способы доставки

| Служба | Регион | Срок |
|--------|--------|------|
| Европочта | Беларусь | 2–3 рабочих дня |
| Белпочта | Беларусь | 2–4 рабочих дня |
| СДЭК | Россия | 3–7 рабочих дней |

---

## Соцсети

- **Telegram:** [@lavkazombie](http://t.me/lavkazombie)
- **VK:** [vk.com/albums-139575762](https://vk.com/albums-139575762)
- **Instagram:** [@lavkazombie](https://www.instagram.com/lavkazombie/)
- **TikTok:** [@lavkazombie](https://www.tiktok.com/@lavkazombie)
- **Поддержка:** [@NikitaZombie](https://t.me/NikitaZombie)

---

## Лицензия

Проект является приватным (`"private": true`).
