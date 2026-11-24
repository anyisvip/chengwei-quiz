'use strict';

(() => {
  const app = document.getElementById('quiz-app');
  const entries = [...window.CHENGWEI_PLAY_QUIZZES,...window.CHENGWEI_INVENTORIES];
  const requested = new URLSearchParams(location.search).get('t');
  const test = entries.find(item=>item.id===requested);
  const escape = value => String(value).replace(/[&<>"']/g, character=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[character]));
  const image = test => `<img src="${quizIllustration(test)}" alt="" width="1200" height="800">`;
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
  const choicesFor = index => test.play ? test.questions[index].options.map(option=>option.text) : inventoryChoices;
  const score = () => getResult(test,test.play?answers.map(answer=>answer-1):answers);
  function readDraft(storage) {
    try {
      return JSON.parse(window[storage].getItem(storageKey));
    } catch {
      return null;
    }
  }
  for (const draft of [readDraft('sessionStorage'),readDraft('localStorage')]) {
    if (Array.isArray(draft?.answers) && draft.answers.length<=test.questions.length &&
        draft.answers.every((answer,index)=>Number.isInteger(answer) && answer>=1 && answer<=choicesFor(index).length) &&
        Number.isInteger(draft.index) && draft.index>=0 && draft.index<=Math.min(test.questions.length-1,draft.answers.length)) {
      answers = draft.answers;
      index = draft.index;
      if (draft.finished && answers.length===test.questions.length) result = score();
      break;
    }
  }

  const save = () => {
    const draft = JSON.stringify({index,answers,finished:Boolean(result)});
    try { sessionStorage.setItem(storageKey,draft); }
    catch { /* Keep the current in-memory state. */ }
    try {
      if (result || !answers.length) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey,draft);
    }
    catch { /* Keep the current in-memory state. */ }
  };
  const focusHeading = () => {
    window.scrollTo(0,0);
    app.querySelector('h1').focus({preventScroll:true});
  };

  function renderQuestion(focus) {
    const followup = playFollowup(test,index,answers[0]-1);
    app.innerHTML = `<section class="question">
      <div class="eyeline"><span>${escape(test.short_title)}</span><span>第 ${index+1} / ${test.questions.length} 题</span></div>
      <progress value="${answers.length}" max="${test.questions.length}" aria-label="作答进度"></progress>
      <img class="question-art" src="${quizIllustration(test)}" alt="">
      ${followup?`<p class="subtle">${escape(followup)}</p>`:''}
      <h1 tabindex="-1">${escape(test.questions[index].text)}</h1>
      ${test.play?'':'<p class="subtle">这句话和你平常的样子有多符合？</p>'}
      <div class="choices" role="group" aria-label="选择答案">
        ${choicesFor(index).map((label,i)=>`<button type="button" data-action="answer" data-answer="${i+1}" aria-pressed="${answers[index]===i+1}">${escape(label)}</button>`).join('')}
      </div>
      <div class="actions quiz-actions">
        <button type="button" class="control" data-action="previous" ${index===0?'disabled':''}>上一题</button>
        <button type="button" class="control primary" data-action="next" ${answers[index]?'':'disabled'}>${index===test.questions.length-1?'看结果':'下一题'}</button>
      </div>
      <button type="button" class="clear-quiz" data-action="clear" ${answers.length?'':'hidden'}>清除本题集进度</button>
    </section>`;
    if (focus) focusHeading();
  }

  function renderResult(focus) {
    const highlights = test.play ? [] : inventoryHighlights(test,result.scores);
    const story = test.play ? playReading(test,result,answers.map(answer=>answer-1)) : null;
    app.innerHTML = `<article class="result">
      <header class="surface result-lead">
        <img src="${quizResultIllustration(test)}" alt="" width="1200" height="800" fetchpriority="high"><div>
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
      ${story?`<section class="surface reading-note play-story">
        <h2>如果给你这段故事拍续集</h2><p>${escape(story.story)}</p>
        <blockquote>${escape(story.caption)}</blockquote>
        <h2>约谁一起玩</h2><p>${escape(story.company)}</p>
        ${story.moments.length?`<details><summary>回看你的两次选择</summary>
          <ul>${story.moments.map(moment=>`<li>${escape(moment)}</li>`).join('')}</ul></details>`:''}
      </section>`:`<section class="surface score-card"><h2>这次的测评轮廓</h2>
        <p>${escape(inventoryPattern(highlights))}</p>
        <p class="subtle">每项是 1 到 5 的平均分，3 对应「说不准」的作答中点。这里用 0.5 分以上的距离提示先读哪些项。</p>
        ${highlights.map(({name,description,prompt,score},i)=>`<details ${i===0?'open':''}><summary>${escape(name)}　${score} / 5</summary>
        <meter min="1" max="5" value="${score}" aria-label="${escape(name)}"></meter>
        <p>${escape(description)}</p><p>${escape(inventoryObservation(test,name,score,answers))}</p>
        <p class="subtle">${escape(prompt)}</p></details>`).join('')}
      </section>
      <section class="surface reading-note"><h2>找两件小事对照</h2>
        <p>${escape(inventoryScenes[test.id])}</p></section>`}
      <section class="surface reading-note">${test.play
        ?'<p>这是一次情境趣测，答案留在浏览器里。好友打开链接可以自己玩一遍。</p>'
        :`<p>各维度取题目平均分，反向题以 6 减去作答分值。答案和分数在当前浏览器中计算。中文题干暂无本地常模，结果供自我探索。</p>
        <p><a href="${escape(test.source)}">查看 IPIP 题库和计分</a></p>`}
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
        app.querySelector('[data-action="clear"]').hidden = false;
        break;
      case 'previous':
        index--;
        save();
        renderQuestion(true);
        break;
      case 'next':
        if (index===test.questions.length-1) {
          result = score();
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
      case 'clear':
        if (!confirm('清除这套题的作答进度并从第一题开始？')) break;
        // Continue to the same reset used on the result page.
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
