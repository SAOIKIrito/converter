const API_URL = 'https://youtube-audio-backend-u5lt.onrender.com';

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

const form = document.querySelector('.converter-container');
const urlInput = document.querySelector('.converter-container input');
const submitBtn = document.querySelector('.submit-btn');
const btnIcon = document.querySelector('.submit-btn i');
const btnText = document.querySelector('.submit-btn span');

function setButtonState(text, icon, spinning = false) {
    if (btnText) {
        btnText.innerText = text;
    }

    if (btnIcon) {
        btnIcon.setAttribute('data-lucide', icon);
        btnIcon.classList.toggle('spinner', spinning);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

async function waitForConversion(taskId) {
    const maxAttempts = 180;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await fetch(`${API_URL}/api/status/${encodeURIComponent(taskId)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Не удалось получить статус конвертации.');
        }

        if (data.status === 'ready') {
            return;
        }

        if (data.status === 'error') {
            throw new Error('Сервер не смог преобразовать видео в MP3.');
        }
    }

    throw new Error('Конвертация занимает слишком долго. Попробуйте ещё раз.');
}

if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const videoUrl = urlInput.value.trim();

        if (!videoUrl) {
            alert('Вставьте ссылку на видео.');
            return;
        }

        try {
            const parsedUrl = new URL(videoUrl);

            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                throw new Error();
            }
        } catch {
            alert('Пожалуйста, вставьте корректную ссылку на видео.');
            return;
        }

        submitBtn.disabled = true;
        setButtonState('Подключение...', 'loader-2', true);

        try {
            const response = await fetch(`${API_URL}/api/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    videoUrl: videoUrl
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Не удалось запустить конвертацию.');
            }

            if (!data.taskId) {
                throw new Error('Сервер не вернул ID задачи.');
            }

            setButtonState('Конвертация...', 'loader-2', true);

            await waitForConversion(data.taskId);

            setButtonState('Скачивание...', 'download', true);

            const downloadUrl = `${API_URL}/api/download/${encodeURIComponent(data.taskId)}`;

            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = 'audio.mp3';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();

            urlInput.value = '';
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            setButtonState('Конвертировать', 'audio-lines', false);
        }
    });
}