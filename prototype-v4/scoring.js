const typeTitles = ['雾海漫游者','落日收藏家','月光织梦者','黎明航行家','心事解读者','微光守夜人','温柔构筑者','星图探路人','森林倾听者','清晨造物者','遥远观察者','山谷共鸣者','海盐诗人','露台策展人','云端旅行者','人间点灯者'];
const storyDirection = (option,index) => option.archetype ?? index;
const inventoryChoices = ['很不符合','不太符合','说不准','比较符合','非常符合'];
const questionnaireScale = test => test.inventory ? 5 : test.id==='tipi10' ? 7 : test.id==='inner16' ? 5 : 0;

function inventoryHighlights(test, scores) {
  return Object.entries(test.domains).map(([name,[title,description,prompt]])=>({
    name,title,description,prompt,score:scores[name],distance:Math.abs(scores[name]-3),
  })).sort((a,b)=>b.distance-a.distance);
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
const title=leading.map(i=>t.archetypes[i]).join(' · ');
const subtitle=leading.length>1?'本次有多种选择方向并列，可以分别读，也可以对照它们出现在什么场景。'
  :t.reflections?.[leading[0]] ?? '从选项分布出发，看看哪些习惯在这次探索里更常出现。';
return {type:'story',title,subtitle,counts,stamp:'ORIGINAL CREATIVE EXPERIENCE',archetypes:t.archetypes};
}
