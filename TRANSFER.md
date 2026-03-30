# BRICK GAME v2.0 — Полная документация для переноса

## Описание
Портативная консоль Brick Game — 3 игры на LCD-экране, имитация устройства из 90-х.

**Автор:** Sergey Mednov (smednov@gmail.com)
**Версия:** 2.0
**Файл:** `brick-game-v2-0.jsx`

---

## Платформа
| Устройство | Режим | Поддержка |
|---|---|---|
| Телефон (iOS/Android) | Portrait | ✅ Полная |
| Телефон | Landscape | ❌ "Поверните телефон" |
| Планшет | Любой | ❌ "Только на телефоне" |
| Десктоп | Любой | ❌ "Только на телефоне" |

---

## 3 игры

### TETRIS
- Классический тетрис, поле 10×22
- ▲ = поворот, ◀▶ = движение, ▼ = вниз, ▼▼▼ = мгновенный сброс (DROP)
- Ghost-фигура (тень) показывает где приземлится
- Окошко NEXT — следующая фигура
- Скорость: 800мс (ур.1) → 100мс (ур.10+)
- Очки: 100/300/500/800 за 1/2/3/4 линии

### SNAKE
- Поле 21×16 (горизонтальный прямоугольник)
- ▲▼◀▶ = смена направления
- FOOD вместо LINES (счётчик съеденной еды)
- Уровень каждые 5 съеденных, скорость увеличивается каждые 5 уровней
- PAUSE/GAME OVER — чёрным цветом посередине поля

### ARKANOID
- Поле 10×22 (как тетрис)
- ◀▶ = движение платформы, ▲/START = запуск мяча
- **25 уникальных паттернов кирпичей** (шахматка, пирамида, рамка, зигзаг, ромб, крест, лесенки, стрелки и др.)
- **2 угла отскока от платформы:**
  - Края (клетки 0 и 3) → крутой угол 45° (мяч резко в сторону)
  - Центр (клетки 1 и 2) → пологий угол (мяч почти вертикально)
- Углы поля: мяч отскакивает в противоположную сторону
- При победе → следующий уровень (новый паттерн)
- При проигрыше → рестарт с того же уровня (не с первого)
- Скорость увеличивается каждые 5 уровней
- После 25 уровней — цикл паттернов

---

## Управление

### Кнопки корпуса
| Кнопка | Тип | Логика |
|---|---|---|
| ▲ ROTATE | Momentary | Поворот / смена направления |
| ◀ LEFT | Momentary | Влево |
| ▶ RIGHT | Momentary | Вправо |
| ▼ DOWN | Momentary | Вниз (×3 за 500мс = DROP) |
| START/PAUSE | Momentary | Старт игры / пауза (не фиксируется) |
| ON/OFF | Toggle | По умолчанию OFF. Нажал → ON (темнее) |
| ♪ SOUND | Toggle | По умолчанию OFF. Нажал → ON (темнее) |
| TET/SNK/ARK | Radio | Выбор игры. Активная = темнее |
| Цвет (×3) | Radio | Выбор темы. Активная = темнее |

### Визуал кнопок
- Нажатая = темнее (того же цвета, не чёрная)
- Надписи всегда белые (включая жёлтую тему)
- Цветные кнопки сохраняют свой цвет при нажатии
- Тактильная отдача: navigator.vibrate(35мс)

---

## Темы корпуса
- **Серый** — классический
- **Розовый** — как Love Brick Game
- **Жёлтый** — солнечный

Все кнопки меняют цвет в соответствии с темой.

---

## Звук
Web Audio API, square wave (ретро-пищалка):
- move, rotate, drop, lock, clear, over (тетрис)
- eat (змейка)
- bounce, brick, win (арканоид)

---

## Архитектура кода

```
brick-game-v2-0.jsx
├── CONFIG         — размеры полей, фигуры, темы, цвета кнопок
├── SOUND          — Web Audio beep engine, SFX библиотека
├── HAPTIC         — navigator.vibrate
├── HELPERS        — createBoard, rotateMat, validT, placeT, clearLinesT
├── DEVICE         — isMobilePhone(), isPortrait()
├── EVENTS         — emitBtn() → CustomEvent("gameBtn")
├── globalState    — сохранение состояния при повороте экрана
├── BrickGame      — точка входа (device/orientation gate)
├── GameController — корпус, кнопки, темы, переключение игр
├── TetrisScreen   — рендер LCD для тетриса/арканоида
├── SnakeScreen    — рендер LCD для змейки
├── LcdStat        — компонент надписи (SCORE/LEVEL и т.д.)
├── TetrisGame     — логика тетриса
├── SnakeGame      — логика змейки
├── ArkanoidGame   — логика арканоида (25 паттернов, 2 угла)
├── DBtn           — кнопка крестовины
├── PillBtn        — овальная кнопка
├── RndBtn         — круглая кнопка селектора
└── BtnLbl         — надпись на кнопке
```

Связь: `DBtn/PillBtn → emitBtn() → CustomEvent("gameBtn") → активная игра`

---

## Перенос в другой чат Claude

```
Проект: Brick Game v2.0 — 3 игры (Tetris, Snake, Arkanoid).
Один файл React (brick-game-v2-0.jsx), самодостаточный, без внешних зависимостей.
Mobile portrait-only. CustomEvent("gameBtn") для связи кнопок и игр.
Арканоид: 25 уникальных паттернов, 2 угла отскока, уровень сохраняется при проигрыше.
Змейка: поле 21×16, FOOD, скорость каждые 5 уровней.
Все кнопки: нажатая=темнее, надписи белые, цветные кнопки сохраняют цвет.

[ВСТАВИТЬ СОДЕРЖИМОЕ brick-game-v2-0.jsx]
```

---

## Деплой на GitHub Pages

### Шаг 1: Создать проект
```bash
npm create vite@latest brick-game -- --template react
cd brick-game
npm install
```

### Шаг 2: Заменить код
Скопировать содержимое `brick-game-v2-0.jsx` в файл `src/App.jsx`

### Шаг 3: Настроить Vite
Файл `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/brick-game/',  // имя репозитория на GitHub
})
```

### Шаг 4: Установить gh-pages
```bash
npm install --save-dev gh-pages
```

В `package.json` добавить в `"scripts"`:
```json
"deploy": "vite build && npx gh-pages -d dist"
```

### Шаг 5: Git + GitHub
```bash
git init
git add .
git commit -m "Brick Game v2.0"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/brick-game.git
git push -u origin main
```

### Шаг 6: Деплой
```bash
npm run deploy
```

### Шаг 7: Включить Pages
GitHub → Settings → Pages → Source: `gh-pages` branch → Save

Игра доступна: `https://ВАШ_ЛОГИН.github.io/brick-game/`

---

## Кастомный домен

### DNS (у вашего регистратора)
Добавить CNAME запись:
```
game.yourdomain.com → ВАШ_ЛОГИН.github.io
```

### Файл CNAME
Создать `public/CNAME` с содержимым:
```
game.yourdomain.com
```

### Vite config
Изменить base:
```js
base: '/',  // для кастомного домена
```

### GitHub
Settings → Pages → Custom domain → ввести `game.yourdomain.com` → Enforce HTTPS

### Повторить деплой
```bash
npm run deploy
```

---

## Альтернативы GitHub Pages

### Vercel (рекомендуется — проще)
1. https://vercel.com → Import Git Repository
2. Framework: Vite → Deploy
3. Кастомный домен: Settings → Domains → Add
4. DNS: добавить CNAME на Vercel

### Netlify
1. https://app.netlify.com → New site from Git
2. Build: `npm run build`, Publish: `dist`
3. Домен: Domain settings → Add custom domain

---

## Требования
- **Node.js** 18+ (https://nodejs.org)
- **npm** (входит в Node.js)
- Больше ничего — React входит в шаблон Vite

### Локальный запуск
```bash
npm install
npm run dev
```

### Сборка
```bash
npm run build
# Результат в dist/
```

---

## Версии
| Версия | Описание |
|---|---|
| v1.0 | Тетрис, 3 темы, звук, mobile-only |
| v2.0 | +Snake +Arkanoid, 25 паттернов, 2 угла отскока, portrait-only, уровень сохраняется, FOOD, оптимизация |

---

*BRICK GAME v2.0 © Sergey Mednov (smednov@gmail.com)*
