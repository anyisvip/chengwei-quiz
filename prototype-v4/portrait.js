'use strict';

const inventoryIllustration = test => '../assets/chengwei_inventory/'+test.art+'.webp';
const portraitFileName = 'chengwei-portrait.jpg';
async function portraitImage(item,test) {
  const source = new Image();
  const qr = new Image();
  source.src = inventoryIllustration(test);
  qr.src = '../assets/chengwei_inventory/qr-'+test.id+'.png';
  await Promise.all([source.decode(),qr.decode(),document.fonts.load('500 62px "Chengwei Heritage Display"',item.title)]);
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1240;
  const context = canvas.getContext('2d',{alpha:false});
  context.fillStyle = '#FAF8F4';
  context.fillRect(0,0,canvas.width,canvas.height);
  const height = Math.min(source.naturalHeight,source.naturalWidth*664/900);
  const width = height*900/664;
  context.drawImage(source,(source.naturalWidth-width)/2,(source.naturalHeight-height)*.34,width,height,0,0,900,664);
  const wash = context.createLinearGradient(0,505,0,670);
  wash.addColorStop(0,'rgba(250,248,244,0)');
  wash.addColorStop(1,'#FAF8F4');
  context.fillStyle = wash;
  context.fillRect(0,505,900,165);
  context.fillStyle = '#35495A';
  context.textBaseline = 'top';
  context.font = '500 27px system-ui, sans-serif';
  context.fillText('澄未  /  白泽心笺',68,684);
  context.font = '500 68px "Chengwei Heritage Display", serif';
  context.fillText(item.title,64,750,772);
  context.font = '500 31px system-ui, sans-serif';
  context.fillText(item.subtitle,68,854,764);
  context.strokeStyle = 'rgba(53,73,90,.24)';
  context.beginPath();
  context.moveTo(68,948);
  context.lineTo(832,948);
  context.stroke();
  context.font = '600 30px system-ui, sans-serif';
  context.fillText('扫码测一测 · '+test.short_title,68,1004,520);
  context.font = '500 23px system-ui, sans-serif';
  context.fillText('打开就能答题，做完也有自己的心笺。',68,1050,520);
  const [base,query] = publicQuizLink(test).split('?');
  context.font = '500 20px system-ui, sans-serif';
  context.fillText(base,68,1110,520);
  context.fillText('?'+query,68,1138,520);
  context.imageSmoothingEnabled = false;
  context.drawImage(qr,594,980,234,234);
  return canvas.toDataURL('image/jpeg',.93);
}

async function shareQuizPortrait(imageUrl,test,nativeHost) {
  const base64 = imageUrl.split(',')[1];
  const title = '澄未 · '+test.short_title;
  const link = publicQuizLink(test);
  if (nativeHost?.sharePortrait) {
    nativeHost.sharePortrait(base64,title+'\n'+link);
    return '';
  }
  const file = new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],portraitFileName,{type:'image/jpeg'});
  if (navigator.share && navigator.canShare?.({files:[file]})) {
    try {
      await navigator.share({files:[file],title,text:title+'\n'+link});
      return '';
    } catch (error) {
      if (error.name==='AbortError') return '';
    }
  }
  const download = document.createElement('a');
  download.href = imageUrl;
  download.download = portraitFileName;
  download.click();
  return '心笺图片已导出，也可以单独复制题集链接。';
}

async function copyPublicQuizLink(test,nativeHost) {
  const link = publicQuizLink(test);
  if (nativeHost?.copyQuizLink) nativeHost.copyQuizLink(link);
  else await navigator.clipboard.writeText(link);
}

