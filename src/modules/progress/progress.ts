export const calculateProgress=(completed:number,total:number)=>total===0?0:Math.round(Math.min(completed,total)/total*100);
export type Rating='AGAIN'|'HARD'|'GOOD'|'EASY';
export function nextReview(now:Date,rating:Rating,previousDays=0){const factor={AGAIN:1,HARD:Math.max(1,previousDays*1.2),GOOD:Math.max(2,previousDays*2),EASY:Math.max(4,previousDays*3)}[rating];return new Date(now.getTime()+Math.round(factor)*86400000);}
