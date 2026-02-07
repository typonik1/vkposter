// ПРОСТАЯ ВЕРСИЯ ДЛЯ ТЕСТА
console.log('🚀 VK Reposter Pro: Простая версия загружена');

// Ждём 3 секунды и добавляем кнопки
setTimeout(() => {
  console.log('🔍 Начинаем поиск постов...');
  
  // Ищем элементы с "wall" в классе или id
  const wallElements = [];
  document.querySelectorAll('*').forEach(el => {
    const cls = String(el.className || '');
    const id = String(el.id || '');
    if (cls.includes('wall') || cls.includes('post') || cls.includes('Post') || 
        id.includes('wall') || id.includes('post')) {
      wallElements.push(el);
    }
  });
  
  console.log(`📋 Найдено элементов с "wall/post": ${wallElements.length}`);
  
  // Ищем кнопки лайков
  const likeButtons = document.querySelectorAll('[class*="like"], [class*="Like"], [class*="action"], [class*="Action"]');
  console.log(`❤️ Найдено элементов с "like/action": ${likeButtons.length}`);
  
  // Пробуем добавить кнопку к первым 10 элементам
  let added = 0;
  likeButtons.forEach((el, i) => {
    if (i < 10 && !el.querySelector('.vkr-test-btn')) {
      const btn = document.createElement('div');
      btn.className = 'vkr-test-btn';
      btn.innerHTML = '🧪 ТЕСТ';
      btn.style.cssText = 'display:inline-block;padding:6px 12px;background:#f00;color:#fff;border-radius:6px;margin-left:8px;cursor:pointer;font-size:12px;font-weight:bold;';
      btn.onclick = () => {
        alert('Кнопка работает!\nЭлемент: ' + el.className);
        console.log('Клик по кнопке:', el);
      };
      
      try {
        el.appendChild(btn);
        added++;
        console.log(`✅ Кнопка ${added} добавлена к:`, el.className);
      } catch(e) {
        console.log(`❌ Не удалось добавить кнопку:`, e.message);
      }
    }
  });
  
  console.log(`🎯 Итого добавлено кнопок: ${added}`);
  
  if (added === 0) {
    console.log('❌ Кнопки не добавлены!');
    console.log('💡 Попробуйте:');
    console.log('1. Обновить страницу');
    console.log('2. Прокрутить ленту вниз');
    console.log('3. Открыть конкретный пост');
    console.log('');
    console.log('🔍 Дебаг информация:');
    console.log('- Элементов с wall/post:', wallElements.length);
    console.log('- Элементов с like/action:', likeButtons.length);
  }
}, 3000);

