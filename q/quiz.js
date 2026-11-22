'use strict';

(() => {
  const app = document.getElementById('quiz-app');
  const entries = window.CHENGWEI_INVENTORIES;
  const requested = new URLSearchParams(location.search).get('t');
  const test = entries.find(item=>item.id===requested);
  const escape = value => String(value).replace(/[&<>"']/g, character=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[character]));
  const image = test => `<img src="${inventoryIllustration(test)}" alt="" width="1200" height="800">`;
  const button = (action,label,primary=false) =>
    `<button type="button" class="control${primary?' primary':''}" data-action="${action}">${label}</button>`;

  if (!test) {
    app.innerHTML = `<h1>选一套题，看看此刻的自己</h1>
      <p class="subtle">${requested?'这套题目前无法打开。可以从下面选一套。':'打开就能答题，做完会得到一张自己的白泽心笺。'}</p>
      <div class="ledger">${entries.map(item=>`<a class="surface" href="?t=${item.id}">${image(item)}
      <span><strong>${escape(item.short_title)}</strong><small>${item.questions.length} 题 · ${escape(item.duration)}</small></span></a>`).join('')}</div>`;
    return;
  }

  document.title = test.short_title+' · 澄未';
  const storageKey = 'chengwei:public-quiz:v1:'+test.id;
  let answers = [];
  let index = 0;
  let result;
  try {
    const draft = JSON.parse(sessionStorage.getItem(storageKey));
    if (Array.isArray(draft?.answers) && draft.answers.length<=test.questions.length &&
        draft.answers.every(answer=>Number.isInteger(answer) && answer>=1 && answer<=5) &&
        Number.isInteger(draft.index) && draft.index>=0 && draft.index<=Math.min(test.questions.length-1,draft.answers.length)) {
      answers = draft.answers;
      index = draft.index;
      if (draft.finished && answers.length===test.questions.length) result = scoreInventory(test,answers);
    }
  } catch {
    // The quiz is usable when embedded browsers block session storage.
  }

  const save = () => {
    try { sessionStorage.setItem(storageKey,JSON.stringify({index,answers,finished:Boolean(result)})); }
    catch { /* Keep the current in-memory state. */ }
  };
  const focusHeading = () => {
    window.scrollTo(0,0);
    app.querySelector('h1').focus({preventScroll:true});
  };

  function renderQuestion(focus) {
    app.innerHTML = `<section class="question">
      <div class="eyeline"><span>${escape(test.short_title)}</span><span>第 ${index+1} / ${test.questions.length} 题</span></div>
      <progress value="${answers.length}" max="${test.questions.length}" aria-label="作答进度"></progress>
      <img class="question-art" src="${inventoryIllustration(test)}" alt="">
      <h1 tabindex="-1">${escape(test.questions[index].text)}</h1>
      <p class="subtle">这句话和你平常的样子有多符合？</p>
      <div class="choices" role="group" aria-label="选择符合程度">
        ${inventoryChoices.map((label,i)=>`<button type="button" data-action="answer" data-answer="${i+1}" aria-pressed="${answers[index]===i+1}">${label}</button>`).join('')}
      </div>
      <div class="actions quiz-actions">
        <button type="button" class="control" data-action="previous" ${index===0?'disabled':''}>上一题</button>
        <button type="button" class="control primary" data-action="next" ${answers[index]?'':'disabled'}>${index===test.questions.length-1?'看结果':'下一题'}</button>
      </div>
    </section>`;
    if (focus) focusHeading();
  }

  function renderResult(focus) {
    const highlights = inventoryHighlights(test,result.scores);
    app.innerHTML = `<article class="result">
      <header class="surface result-lead">${image(test)}<div>
        <span class="subtle">${escape(test.short_title)} · 白泽心笺</span>
        <h1 tabindex="-1">${escape(result.title)}</h1><p>${escape(result.subtitle)}</p>
        <div class="actions">${button('prepare','生成并分享心笺',true)}</div>
      </div></header>
      <section class="surface share-box" hidden>
        <h2>分享这张心笺</h2>
        <img alt="心笺预览，附题集二维码和网址" width="900" height="1240" hidden>
        <p class="subtle" role="status">正在准备心笺…</p>
        <a href="${publicQuizLink(test)}">${publicQuizLink(test)}</a>
        <div class="actions">
          <button type="button" class="control primary" data-action="share" disabled>分享图片</button>
          ${button('copy','复制链接')}
        </div>
      </section>
      <section class="surface score-card"><h2>这次的测评轮廓</h2>
        <p class="subtle">每项得分为 1 到 5，3 是作答中点。展开一项可以读解释。</p>
        ${highlights.map(({name,description,prompt,score},i)=>`<details ${i===0?'open':''}><summary>${escape(name)}　${score} / 5</summary>
        <meter min="1" max="5" value="${score}" aria-label="${escape(name)}"></meter>
        <p>${escape(description)}</p><p class="subtle">${escape(prompt)}</p></details>`).join('')}
      </section>
      <section class="surface reading-note"><p>答案和分数仅在当前浏览器中计算。中文题干暂无本地常模，结果供自我探索。</p>
        <p><a href="${escape(test.source)}">查看 IPIP 题库和计分</a></p>
        <div class="actions">${button('restart','重新答题')}<a class="control" href="./">试试其他题集</a></div>
      </section>
    </article>`;
    if (focus) focusHeading();
  }

  async function showShareBox() {
    const box = app.querySelector('.share-box');
    const preview = box.querySelector('img');
    box.hidden = false;
    box.scrollIntoView({block:'start'});
    if (!preview.hidden) return;
    const prepare = app.querySelector('[data-action="prepare"]');
    const status = box.querySelector('[role="status"]');
    prepare.disabled = true;
    try {
      preview.src = await portraitImage(result,test);
      preview.hidden = false;
      box.querySelector('[data-action="share"]').disabled = false;
      status.textContent = '好友扫码或打开链接就能做题。';
    } catch {
      status.textContent = '心笺暂时无法生成，你可以重新尝试。';
    } finally {
      prepare.disabled = false;
    }
  }

  app.addEventListener('click', async event=>{
    const control = event.target.closest('button[data-action]');
    if (!control) return;
    switch (control.dataset.action) {
      case 'answer':
        answers[index] = Number(control.dataset.answer);
        save();
        for (const option of app.querySelectorAll('[data-answer]')) option.setAttribute('aria-pressed',String(option===control));
        app.querySelector('progress').value = answers.length;
        app.querySelector('[data-action="next"]').disabled = false;
        break;
      case 'previous':
        index--;
        save();
        renderQuestion(true);
        break;
      case 'next':
        if (index===test.questions.length-1) {
          result = scoreInventory(test,answers);
          save();
          renderResult(true);
        } else {
          index++;
          save();
          renderQuestion(true);
        }
        break;
      case 'prepare':
        await showShareBox();
        break;
      case 'share': {
        const message = await shareQuizPortrait(app.querySelector('.share-box img').src,test);
        if (message) app.querySelector('.share-box [role="status"]')?.replaceChildren(message);
        break;
      }
      case 'copy': {
        const status = app.querySelector('.share-box [role="status"]');
        try { await copyPublicQuizLink(test); status.textContent = '已复制题集链接。'; }
        catch { status.textContent = '请长按上方链接复制。'; }
        break;
      }
      case 'restart':
        answers = [];
        index = 0;
        result = null;
        save();
        renderQuestion(true);
        break;
    }
  });

  if (result) renderResult(false);
  else renderQuestion(false);
})();
