const typeTitles = ['雾海漫游者','落日收藏家','月光织梦者','黎明航行家','心事解读者','微光守夜人','温柔构筑者','星图探路人','森林倾听者','清晨造物者','遥远观察者','山谷共鸣者','海盐诗人','露台策展人','云端旅行者','人间点灯者'];
const storyDirection = (option,index) => option.archetype ?? index;
const inventoryChoices = ['很不符合','不太符合','说不准','比较符合','非常符合'];
const questionnaireScale = test => test.inventory ? 5 : test.id==='tipi10' ? 7 : test.id==='inner16' ? 5 : 0;

function playFollowup(test,index,firstChoice) {
  if (!test.play || index!==1) return '';
  return test.followups[test.questions[0].options[firstChoice]?.archetype] ?? '';
}

const inventoryScenes = {
  ipip50:'回想上次你和熟人一起做事、以及和陌生人一起做事。你在哪个场合更主动开口或安排下一步？各记一个做法。',
  'ipip-relations':'挑两次有分歧的聊天，一次对方很熟，一次还不熟。你当时说了哪句开场白？可以把原话写下来对照。',
  'ipip-emotions':'回想一次临时变动。记下你最先察觉的情绪，再记下十分钟后的变化。换到另一个相似场景时，两次反应在哪里相同？',
  'ipip-initiative':'找一件立刻动手的小事，再找一件只记在备忘录的点子。两次最早出现的阻力是什么？',
  'ipip-pace':'各挑一个一下就被排满的上午和一个留了空档的上午。你从哪件事开始，什么时候察觉自己想停一停？',
  'ipip-belonging':'比较一次自在的独处和一次自在的相聚。各记一处细节，比如你有没有主动提议再坐一会儿。',
};

function inventoryHighlights(test, scores) {
  return Object.entries(test.domains).map(([name,[title,description,prompt]])=>({
    name,title,description,prompt,score:scores[name],distance:Math.abs(scores[name]-3),
  })).sort((a,b)=>b.distance-a.distance);
}

function inventoryPattern(highlights) {
  const higher = highlights.filter(item=>item.score>=3.5);
  const lower = highlights.filter(item=>item.score<=2.5);
  const describe = (items,label)=>items.length
    ? `${label}的方向包括${items.slice(0,2).map(({name,score})=>`「${name}」${score} 分`).join('、')}。`
    : '';
  return describe(higher,'较常符合')+describe(lower,'较少符合') ||
    '各项均值都接近作答中点。可以展开逐题作答，看看你常选中间，还是在不同题目上往两个方向选。';
}

function inventoryObservation(test, dimension, score, answers) {
  const values = test.questions.flatMap((question,index)=>{
    const answer = answers?.[index];
    if (question.dimension!==dimension || !Number.isInteger(answer) || answer<1 || answer>5) return [];
    return [question.reverse?6-answer:answer];
  });
  const higher = values.filter(value=>value>3).length;
  const lower = values.filter(value=>value<3).length;
  const direction = score>3
    ? '这次的作答整体往这个方向靠近。'
    : score<3 ? '这次的作答整体较少符合这个方向。' : '这次的平均分落在作答中点。';
  if (!values.length) return direction;
  const context = higher && lower
    ? '这组题里出现了两端的选择。可以对照题干描写的场合，看看在哪些情境下反应会变。'
    : '可以找一道印象深的题，回想一个支持该回答的实际经历。';
  return `${direction} 统一计分方向后，${higher} 题高于中点，${lower} 题低于中点，${values.length-higher-lower} 题选在中间。${context}`;
}

function playReading(test, result, answers) {
  const most = Math.max(...result.counts);
  const leaders = result.counts.flatMap((count,index)=>count===most?[index]:[]);
  const [story,company,caption] = test.readings[leaders.length===1?leaders[0]:test.archetypes.length];
  const moments = test.questions.flatMap((question,index)=>{
    const choice = question.options[answers?.[index]];
    return choice && leaders.includes(choice.archetype) ? [choice.text] : [];
  }).slice(0,2);
  return {story,company,caption,moments};
}

function scoreInventory(test, answers) {
  const totals = Object.fromEntries(Object.keys(test.domains).map(name=>[name,{sum:0,count:0}]));
  for (const [index,question] of test.questions.entries()) {
    const answer = answers[index];
    if (!Number.isInteger(answer) || answer<1 || answer>5) return null;
    const group = totals[question.dimension];
    group.sum += question.reverse ? 6-answer : answer;
    group.count++;
  }
  const scores = Object.fromEntries(Object.entries(totals).map(([name,{sum,count}])=>[name,sum/count]));
  const [first,second] = inventoryHighlights(test,scores);
  return {
    type:'inventory',
    title:first.distance>=.5 && first.distance>second.distance ? first.title : test.short_title+'手记',
    subtitle:test.portrait,
    scores,
  };
}

/* Existing questionnaire scoring, shared by the questionnaires. */
function getResult(t,answers){
if(t.inventory) return scoreInventory(t,answers);
if(t.id==='tipi10'){
const vals={};for(let i=0;i<t.questions.length;i++){let q=t.questions[i],n=answers[i];if(n==null)return null;let v=q.reverse?8-n:n;(vals[q.dimension]||= []).push(v)}const scores=Object.fromEntries(Object.entries(vals).map(([k,v])=>[k,Math.round((v[0]+v[1])/2*10)/10]));let lead=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];return {type:'traits',title:'五种光谱，构成流动的你',subtitle:'这是五个连续特质的初步自评轮廓，并不是对你人格的最终判定。',scores,highlight:lead?.[0]||'',stamp:'TIPI · RESEARCH DEMO'}}
if(t.id==='inner16'){if(t.questions.some((_,i)=>answers[i]==null))return null;let sums={E:0,N:0,F:0,P:0},n={E:0,N:0,F:0,P:0};for(let i=0;i<t.questions.length;i++){let q=t.questions[i];sums[q.axis]+=(answers[i]-3)*q.direction;n[q.axis]++}const code=(sums.E>=0?'E':'I')+(sums.N>=0?'N':'S')+(sums.F>=0?'F':'T')+(sums.P>=0?'P':'J');const idx=(sums.E>=0?8:0)+(sums.N>=0?4:0)+(sums.F>=0?2:0)+(sums.P>=0?1:0);return {type:'types',title:typeTitles[idx],subtitle:'你在四种日常选择倾向之间，组合出一种属于自己的叙事气质。类型是原创趣味结构，不能等同官方 MBTI® 测量。',code,axes:{'能量方向':Math.round((sums.E/(n.E*2)+1)*50),'信息偏好':Math.round((sums.N/(n.N*2)+1)*50),'决定风格':Math.round((sums.F/(n.F*2)+1)*50),'生活节奏':Math.round((sums.P/(n.P*2)+1)*50)},stamp:'INNER 16 · ORIGINAL'}}
const counts=Array(t.archetypes.length).fill(0);
for (const [i,question] of t.questions.entries()) {
  const choice=question.options[answers[i]];
  if (!choice) return null;
  counts[storyDirection(choice,answers[i])]++;
}
const leading=counts.map((count,i)=>count===Math.max(...counts)?i:-1).filter(i=>i>=0);
const blend = leading.length>1 ? t.blend : undefined;
const title=blend?.[0] ?? leading.map(i=>t.archetypes[i]).join(' · ');
const subtitle=blend?.[1] ?? (leading.length>1?'本次有多种选择方向并列，可以分别读，也可以对照它们出现在什么场景。'
  :t.reflections?.[leading[0]] ?? '从选项分布出发，看看哪些习惯在这次探索里更常出现。');
return {type:'story',title,subtitle,counts,stamp:'ORIGINAL CREATIVE EXPERIENCE',archetypes:t.archetypes};
}
