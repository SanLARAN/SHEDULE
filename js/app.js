// =====================================================
// 🚀 TELEGRAM WEB APP
// =====================================================

const tg = window.Telegram?.WebApp;
let currentDay = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    initApp();
    initBanner();
});

function initTelegram() {
    if (tg) {
        tg.ready();
        tg.expand();

        // Применяем тему Telegram
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark');
        }

        // Слушаем изменение темы
        tg.onEvent('themeChanged', () => {
            document.body.classList.toggle('dark', tg.colorScheme === 'dark');
        });

        // Кнопка "Назад" в Telegram
        tg.BackButton.onClick(() => {
            tg.close();
        });
    } else {
        // Для тестирования в браузере
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark');
        }
    }
}

function initApp() {
    // Определяем текущий день
    const today = getTodayName();
    currentDay = today;

    // Инициализируем кнопки дней
    initDayButtons();

    // Показываем расписание
    selectDay(currentDay);

    // Обновляем статус
    updateCurrentStatus();

    // Обновляем время в футере
    updateFooter();

    // Автообновление каждую минуту
    setInterval(() => {
        updateCurrentStatus();
        if (currentDay === getTodayName()) {
            renderSchedule(currentDay);
        }
    }, 60000);
}

// =====================================================
// 📅 РАБОТА С ДАТАМИ
// =====================================================

function getTodayName() {
    const days = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
    return days[new Date().getDay()];
}

function getDateForDay(dayName) {
    const today = new Date();
    const todayIndex = today.getDay(); // 0 = ВС
    const daysMap = { "ВС": 0, "ПН": 1, "ВТ": 2, "СР": 3, "ЧТ": 4, "ПТ": 5, "СБ": 6 };
    const targetIndex = daysMap[dayName];

    const diff = targetIndex - todayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);

    return targetDate;
}

function formatDate(date) {
    const options = { day: 'numeric', month: 'long' };
    return date.toLocaleDateString('ru-RU', options);
}

function parseTime(timeStr) {
    const [start, end] = timeStr.split('–');
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return {
        start: startH * 60 + startM,
        end: endH * 60 + endM
    };
}

function getCurrentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// =====================================================
// 📊 ТЕКУЩИЙ СТАТУС
// =====================================================

function getCurrentLessonInfo() {
    const today = getTodayName();
    const lessons = SCHEDULE[today] || [];
    const currentMins = getCurrentMinutes();

    if (lessons.length === 0) {
        return { status: 'holiday', message: 'Сегодня выходной!' };
    }

    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const time = parseTime(lesson.time);

        if (currentMins >= time.start && currentMins <= time.end) {
            const remaining = time.end - currentMins;
            return {
                status: 'lesson',
                lesson: lesson,
                number: i + 1,
                remaining: remaining,
                total: lessons.length
            };
        }

        if (i < lessons.length - 1) {
            const nextTime = parseTime(lessons[i + 1].time);
            if (currentMins > time.end && currentMins < nextTime.start) {
                const remaining = nextTime.start - currentMins;
                return {
                    status: 'break',
                    nextLesson: lessons[i + 1],
                    nextNumber: i + 2,
                    remaining: remaining,
                    total: lessons.length
                };
            }
        }
    }

    const firstTime = parseTime(lessons[0].time);
    if (currentMins < firstTime.start) {
        const remaining = firstTime.start - currentMins;
        return {
            status: 'before',
            firstLesson: lessons[0],
            remaining: remaining,
            total: lessons.length
        };
    }

    const lastTime = parseTime(lessons[lessons.length - 1].time);
    if (currentMins > lastTime.end) {
        return { status: 'after', message: 'Уроки закончились!' };
    }

    return { status: 'unknown' };
}

function updateCurrentStatus() {
    const container = document.getElementById('current-status');
    const info = getCurrentLessonInfo();

    let html = '<div class="status-main">';

    switch (info.status) {
        case 'lesson':
            html += `
                <span class="status-icon">📖</span>
                <div class="status-text">
                    <div class="status-title">${info.lesson.subject}</div>
                    <div class="status-subtitle">Урок ${info.number}/${info.total} • каб. ${info.lesson.room}</div>
                </div>
                <div class="status-time">${info.remaining} мин</div>
            `;
            break;

        case 'break':
            html += `
                <span class="status-icon">☕</span>
                <div class="status-text">
                    <div class="status-title">Перемена</div>
                    <div class="status-subtitle">Далее: ${info.nextLesson.subject}</div>
                </div>
                <div class="status-time">${info.remaining} мин</div>
            `;
            break;

        case 'before':
            html += `
                <span class="status-icon">😴</span>
                <div class="status-text">
                    <div class="status-title">До уроков</div>
                    <div class="status-subtitle">Первый: ${info.firstLesson.subject}</div>
                </div>
                <div class="status-time">${info.remaining} мин</div>
            `;
            break;

        case 'after':
            html += `
                <span class="status-icon">🎉</span>
                <div class="status-text">
                    <div class="status-title">Уроки закончились!</div>
                    <div class="status-subtitle">Свобода!</div>
                </div>
            `;
            break;

        case 'holiday':
            html += `
                <span class="status-icon">🌴</span>
                <div class="status-text">
                    <div class="status-title">Выходной!</div>
                    <div class="status-subtitle">Отдыхай</div>
                </div>
            `;
            break;

        default:
            html += `
                <span class="status-icon">📚</span>
                <div class="status-text">
                    <div class="status-title">Расписание</div>
                </div>
            `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// =====================================================
// 🗓 НАВИГАЦИЯ ПО ДНЯМ
// =====================================================

function initDayButtons() {
    const buttons = document.querySelectorAll('.day-btn');
    const today = getTodayName();

    buttons.forEach(btn => {
        const day = btn.dataset.day;

        // Отмечаем сегодняшний день
        if (day === today) {
            btn.classList.add('today');
        }

        // Обработчик клика
        btn.addEventListener('click', () => selectDay(day));
    });
}

function selectDay(day) {
    currentDay = day;

    // Обновляем активную кнопку
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.day === day);
    });

    // Обновляем информацию о дне
    updateDayInfo(day);

    // Рендерим расписание
    renderSchedule(day);

    // Хаптик (вибрация) в Telegram
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
    }
}

function updateDayInfo(day) {
    const container = document.getElementById('day-info');
    const date = getDateForDay(day);
    const lessons = SCHEDULE[day] || [];

    const isToday = day === getTodayName();
    const dateStr = isToday ? 'Сегодня' : formatDate(date);
    const countStr = lessons.length ? `${lessons.length} уроков` : 'Выходной';

    container.innerHTML = `
        <span class="day-date">${DAYS_FULL[day]}, ${dateStr}</span>
        <span class="day-count">${countStr}</span>
    `;
}

// =====================================================
// 📋 РЕНДЕР РАСПИСАНИЯ
// =====================================================

function renderSchedule(day) {
    const container = document.getElementById('schedule-list');
    const lessons = SCHEDULE[day] || [];

    if (lessons.length === 0) {
        container.innerHTML = `
            <div class="empty-day">
                <div class="empty-day-icon">🎉</div>
                <div class="empty-day-text">Выходной!</div>
            </div>
        `;
        return;
    }

    const isToday = day === getTodayName();
    const currentMins = getCurrentMinutes();

    let html = '';

    lessons.forEach((lesson, index) => {
        const time = parseTime(lesson.time);
        let status = '';
        let statusText = '';

        if (isToday) {
            if (currentMins > time.end) {
                status = 'passed';
                statusText = '✓';
            } else if (currentMins >= time.start && currentMins <= time.end) {
                status = 'active';
                statusText = 'Сейчас';
            }
        }

        html += `
            <div class="lesson-card ${status}">
                <div class="lesson-number">${status === 'passed' ? '✓' : index + 1}</div>
                <div class="lesson-content">
                    <div class="lesson-subject">${lesson.subject}</div>
                    <div class="lesson-details">
                        <span class="lesson-time">🕐 ${lesson.time}</span>
                        <span class="lesson-room">🚪 ${lesson.room}</span>
                    </div>
                </div>
                ${statusText ? `<span class="lesson-status">${statusText}</span>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// =====================================================
// 🎨 БАННЕР
// =====================================================

function initBanner() {
    if (!BANNER_CONFIG.enabled) return;

    // Проверяем, показывали ли уже
    if (BANNER_CONFIG.showOnce && sessionStorage.getItem('bannerShown')) {
        return;
    }

    // Настраиваем баннер
    const banner = document.getElementById('banner');
    const bannerImg = banner.querySelector('.banner-image');
    const bannerTitle = banner.querySelector('.banner-text h3');
    const bannerDesc = banner.querySelector('.banner-text p');
    const bannerBtn = banner.querySelector('.banner-button');

    bannerImg.src = BANNER_CONFIG.image;
    bannerTitle.textContent = BANNER_CONFIG.title;
    bannerDesc.textContent = BANNER_CONFIG.description;
    bannerBtn.textContent = BANNER_CONFIG.buttonText;
    bannerBtn.href = BANNER_CONFIG.buttonLink;

    // Показываем с задержкой
    setTimeout(() => {
        banner.classList.remove('hidden');
        sessionStorage.setItem('bannerShown', 'true');

        // Хаптик
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }, BANNER_CONFIG.delay);
}

function closeBanner() {
    const banner = document.getElementById('banner');
    banner.classList.add('hidden');

    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// =====================================================
// 🔧 УТИЛИТЫ
// =====================================================

function updateFooter() {
    const footer = document.getElementById('last-update');
    const now = new Date();
    footer.textContent = `Обновлено: ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}