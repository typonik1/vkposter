const BUTTON_CLASS = 'vkr-btn';
const PROCESSED_ATTR = 'data-vkr-checked';

function getPostIdFromElement(postEl) {
  if (!postEl) return null;
  const dataId = postEl.getAttribute('data-post-id') || postEl.dataset?.postId;
  if (dataId) {
    const normalized = dataId.startsWith('wall') ? dataId : `wall${dataId}`;
    return normalized;
  }
  if (postEl.id && postEl.id.startsWith('post-')) {
    return `wall${postEl.id.replace('post-', '')}`;
  }
  const link = postEl.querySelector('a[href*="wall"], a[href*="post"]');
  if (link) {
    const m = link.href.match(/wall-?\d+_\d+/);
    if (m) return m[0];
  }
  return null;
}

function getPostUrl(postEl) {
  const id = getPostIdFromElement(postEl);
  if (!id) return null;
  return `https://vk.com/${id}`;
}

function findActionsContainer(postEl) {
  const selectors = [
    '.PostActions',
    '.post_actions',
    '.post_actions_btns',
    '.PostActionsWrapper',
    '.PostActionsBottom',
    '.PostBottomActions',
    '.PostFooter',
    '.post_footer',
    '.like_wrap',
    '.like_cont',
    '.PostButton',
    '.PostButtonGroup',
    '[class*="PostActions"]',
    '[class*="post_actions"]',
    '[class*="PostBottom"]',
    '[class*="PostFooter"]',
    '[class*="like_wrap"]',
    '[class*="like_cont"]'
  ];
  for (const selector of selectors) {
    const el = postEl.querySelector(selector);
    if (el) return el;
  }
  const actionButton = postEl.querySelector(
    'button[aria-label*="Нравится"], button[aria-label*="Мне нравится"], a[aria-label*="Нравится"], [data-like-button]'
  );
  if (actionButton) {
    return (
      actionButton.closest('[class*="Actions"], [class*="actions"], [class*="PostButton"], [class*="like"]') ||
      actionButton.parentElement
    );
  }
  const timeLink = postEl.querySelector('a[href*="wall"], a[href*="post"]');
  if (timeLink) {
    return timeLink.parentElement || timeLink;
  }
  return null;
}

function addButton(postEl) {
  if (!postEl || postEl.querySelector(`.${BUTTON_CLASS}`)) return;
  const actions = findActionsContainer(postEl);
  if (!actions) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = BUTTON_CLASS;
  btn.textContent = '📋 В группы';
  btn.addEventListener('click', async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const postUrl = getPostUrl(postEl);
    if (!postUrl) {
      alert('Не удалось определить ссылку на пост.');
      return;
    }
    await chrome.storage.local.set({ vkr_last_post: postUrl });
    chrome.runtime.sendMessage({ type: 'open_popup', postUrl });
  });

  actions.appendChild(btn);
}

function processPosts(root = document) {
  const posts = root.querySelectorAll(
    '[data-post-id], div[id^="post-"], article[data-post-id], .post, .wall_item, .feed_row, .Post'
  );
  posts.forEach((postEl) => {
    if (postEl.getAttribute(PROCESSED_ATTR)) return;
    postEl.setAttribute(PROCESSED_ATTR, '1');
    addButton(postEl);
  });
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (
        node.matches &&
        (node.matches('[data-post-id]') ||
          node.matches('div[id^="post-"]') ||
          node.matches('article[data-post-id]') ||
          node.matches('.post') ||
          node.matches('.wall_item') ||
          node.matches('.feed_row') ||
          node.matches('.Post'))
      ) {
        processPosts(node.parentElement || document);
      } else if (node.querySelectorAll) {
        processPosts(node);
      }
    });
  }
});

processPosts();
setTimeout(processPosts, 1500);
observer.observe(document.documentElement, { childList: true, subtree: true });
